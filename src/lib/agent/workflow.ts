import { z } from "zod";
import { getLLM } from "@/lib/agent/llm";
import { runWebResearch } from "@/lib/agent/web-search";
import { parseTimeoutMs, withTimeout } from "@/lib/agent/timeouts";
import { getKbForProcessType } from "@/lib/knowledgebase/pakistan";
import {
  AgentResponseSchema,
  ClarificationOutputSchema,
  ExtractorOutputSchema,
  NavigatorAndDocumentsOutputSchema,
  UrduTranslationOutputSchema,
  ValidatorOutputSchema,
  WebSearchOutputSchema,
} from "@/lib/agent/schemas";

const UserInputSchema = z.object({
  message: z.string().min(1),
});

export type RunAgentWorkflowInput = z.infer<typeof UserInputSchema>;

type HelpfulLink = { name: string; url: string; note?: string };
const VERCEL_HOBBY_MAX_RUNTIME_MS = 300_000;
const VERCEL_TIMEOUT_SAFETY_BUFFER_MS = 15_000;

function buildHelpfulLinks(input: {
  kb: { officialPortals: Array<{ name: string; url?: string; note?: string }> } | null;
  webSearch: { results: Array<{ title: string; url: string }> };
}): HelpfulLink[] {
  const out: HelpfulLink[] = [];

  if (input.kb) {
    for (const p of input.kb.officialPortals) {
      if (!p.url) continue;
      out.push({ name: p.name, url: p.url, note: p.note });
    }
  }

  for (const r of input.webSearch.results.slice(0, 3)) {
    out.push({ name: r.title, url: r.url });
  }

  // Dedupe by URL.
  const seen = new Set<string>();
  return out.filter((l) => {
    const key = l.url.trim().toLowerCase();
    if (!key) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function webSearchQueriesFromContext(
  userMessage: string,
  extractor: Pick<
    z.infer<typeof ExtractorOutputSchema>,
    "processType" | "assumedJurisdiction"
  >,
): string[] {
  const msg = userMessage.trim().replace(/\s+/g, " ").slice(0, 280);
  const q1 =
    msg.length >= 4 ? `${msg} Pakistan official` : "Pakistan government application";
  const q2 = `${extractor.processType} ${extractor.assumedJurisdiction} Pakistan requirements`
    .replace(/\s+/g, " ")
    .trim();
  return [...new Set([q1, q2].filter((q) => q.length >= 4))].slice(0, 2);
}

function pushUnique(arr: string[], value: string) {
  const normalized = value.trim();
  if (!normalized) return;
  if (arr.some((v) => v.toLowerCase() === normalized.toLowerCase())) return;
  arr.push(normalized);
}

function addMissingQuestion(
  missingFields: string[],
  questions: string[],
  field: string,
  question: string,
) {
  pushUnique(missingFields, field);
  pushUnique(questions, question);
}

function buildClarification(input: {
  userMessage: string;
  extractor: {
    processType: string;
    requiredFields: Array<{ key: string; label: string }>;
    questionsToAsk?: string[];
  };
  validator: {
    missingFields?: string[];
    nextBestQuestion: string;
  };
}): z.infer<typeof ClarificationOutputSchema> {
  const message = input.userMessage.toLowerCase();
  const missingFields: string[] = [];
  const questions: string[] = [];
  const hasStructuredAnswers =
    /structured details|additional user details|answer \d+:/i.test(
      input.userMessage,
    );

  const hasProvince = /\b(punjab|sindh|kpk|kp|khyber|balochistan|islamabad|ict|ajk|kashmir|gilgit|gb)\b/i.test(
    message,
  );
  const hasDistrictOrCity =
    /\b(district|tehsil|union council|uc|city|lahore|karachi|islamabad|rawalpindi|peshawar|quetta|faisalabad|multan|hyderabad|gujranwala|sialkot)\b/i.test(
      message,
    );
  const hasPassportCategory =
    /\b(new|renew|renewal|reissue|re-issue|lost|stolen|duplicate|replace|modification)\b/i.test(
      message,
    );
  const hasApplicantType =
    /\b(self|myself|dependent|minor|child|guardian)\b/i.test(message);

  if (input.extractor.processType === "domicile") {
    if (!hasProvince) {
      addMissingQuestion(
        missingFields,
        questions,
        "province",
        "Which province is this for (Punjab, Sindh, Khyber Pakhtunkhwa, Balochistan, ICT, AJK, or Gilgit-Baltistan)?",
      );
    }
    if (!hasDistrictOrCity) {
      addMissingQuestion(
        missingFields,
        questions,
        "district/city",
        "Which district or city are you applying from?",
      );
    }
    if (!hasApplicantType) {
      addMissingQuestion(
        missingFields,
        questions,
        "applicant type",
        "Is the domicile for yourself, a dependent, or a minor child?",
      );
    }
  }

  if (input.extractor.processType === "passport" && !hasPassportCategory) {
    addMissingQuestion(
      missingFields,
      questions,
      "passport category",
      "Is this a new passport, renewal, or replacement for a lost/stolen passport?",
    );
  }
  if (
    input.extractor.processType === "passport" &&
    !hasDistrictOrCity &&
    !hasStructuredAnswers
  ) {
    addMissingQuestion(
      missingFields,
      questions,
      "city",
      "Which city are you applying from (for nearest passport office guidance)?",
    );
  }

  // For non-domicile document flows, province is still often required.
  if (
    ["other", "university"].includes(input.extractor.processType) &&
    !hasProvince
  ) {
    addMissingQuestion(
      missingFields,
      questions,
      "province",
      "Which province is this application for?",
    );
  }

  for (const f of input.extractor.requiredFields) {
    const token = `${f.key} ${f.label}`.toLowerCase();
    if (token.includes("province") && !hasProvince) {
      pushUnique(missingFields, "province");
    }
    if ((token.includes("district") || token.includes("city")) && !hasDistrictOrCity) {
      pushUnique(missingFields, "district/city");
    }
  }

  const shortPrompt = input.userMessage.trim().split(/\s+/).length <= 7;
  if (!hasStructuredAnswers && shortPrompt && questions.length === 0) {
    pushUnique(questions, input.validator.nextBestQuestion);
  }

  const mustClarify = questions.length > 0;

  return ClarificationOutputSchema.parse({
    required: mustClarify,
    missingFields: mustClarify ? missingFields.slice(0, 6) : [],
    questions: mustClarify ? questions.slice(0, 4) : [],
  });
}

export async function runAgentWorkflow(input: RunAgentWorkflowInput) {
  // Three structured LLM calls + web search; self-hosted models often need >5m.
  // On Vercel, clamp below the platform limit so we can return a controlled 504
  // rather than a hard runtime kill.
  const configuredCapMs = parseTimeoutMs(
    process.env.AGENT_WORKFLOW_TIMEOUT_MS,
    900_000,
    1_800_000,
  );
  const runningOnVercel = process.env.VERCEL === "1";
  const capMs = runningOnVercel
    ? Math.min(
        configuredCapMs,
        VERCEL_HOBBY_MAX_RUNTIME_MS - VERCEL_TIMEOUT_SAFETY_BUFFER_MS,
      )
    : configuredCapMs;
  return withTimeout(runAgentWorkflowInner(input), capMs, "Agent workflow");
}

async function runAgentWorkflowInner(input: RunAgentWorkflowInput) {
  const { message } = UserInputSchema.parse(input);
  const llm = getLLM();
  const fastMode = process.env.AGENT_FAST_MODE !== "0";

  const extractor = await llm
    .withStructuredOutput(ExtractorOutputSchema)
    .invoke([
      [
        "system",
        [
          "You are the Requirement Extractor for Pakistani bureaucracy processes.",
          "Given a user request, infer the likely process type (domicile/passport/university/other), summarize intent,",
          "list required fields (key+label) that must be collected to proceed, and ask clarifying questions for missing info.",
          "Be concrete and Pakistan-focused, but if province/city is unknown, state an assumption and ask.",
        ].join("\n"),
      ],
      ["human", message],
    ]);

  const kb = getKbForProcessType(extractor.processType);

  const webSearchPromise = fastMode
    ? Promise.resolve(
        WebSearchOutputSchema.parse({
          provider: "none",
          queries: [],
          results: [],
          warning: "Fast mode: web search skipped (AGENT_FAST_MODE enabled).",
        }),
      )
    : runWebResearch(webSearchQueriesFromContext(message, extractor));

  const validatorPromise = fastMode
    ? Promise.resolve(
        ValidatorOutputSchema.parse({
          missingFields: [],
          risksOrWarnings: [],
          nextBestQuestion:
            extractor.questionsToAsk?.[0] ??
            "Which city/province is this for, and what documents do you already have (CNIC/B-Form, photos, proof of address)?",
        }),
      )
    : llm.withStructuredOutput(ValidatorOutputSchema).invoke([
        [
          "system",
          [
            "You are the Validation Agent.",
            "Given the extractor output and the user's original message, identify missing fields and risks/warnings.",
            "Return a single best next question to ask the user.",
            "Do not invent user data.",
          ].join("\n"),
        ],
        [
          "human",
          JSON.stringify({ userMessage: message, extractor, kb }, null, 2),
        ],
      ]);

  const [webSearch, validator] = await Promise.all([
    webSearchPromise,
    validatorPromise,
  ]);
  const clarification = buildClarification({
    userMessage: message,
    extractor,
    validator,
  });

  const helpfulLinks = buildHelpfulLinks({ kb, webSearch });

  const navAndDocs = await llm
    .withStructuredOutput(NavigatorAndDocumentsOutputSchema)
    .invoke([
      [
        "system",
        [
          "You are the Process Navigator and Document Generator for Pakistan-focused bureaucracy.",
          "You may receive `kb` (a small internal knowledge base): treat it as a checklist baseline; web search and user details can refine it.",
          "You may receive webSearch.results (title, url, snippet)—treat as hints, not legal advice.",
          "You may receive `helpfulLinks` (official portals and key pages). Always include these as clickable URLs in your output.",
          "When referencing a portal/office, include the live URL in Markdown format like: https://example.com",
          "Produce: (1) clear step-by-step guide with office/portal, required document checklist, fees/timelines;",
          "For steps: include portal URLs in either `details` or `officeOrPortal` when relevant.",
          "(2) For EVERY item in the documents array, put the COMPLETE draft in the content field: multiple paragraphs, bullet lists, and {{placeholder}} fields as needed.",
          "Never use 'see below', 'template follows', or an empty section—always include the full letter or form body in that same content string.",
          "At the end of each generated document content, add a short 'Official links' section listing 1–3 relevant URLs from `helpfulLinks`.",
          "Use plain Markdown in step details and document bodies (**bold**, lists, line breaks). Avoid raw HTML unless necessary.",
          "If snippets mention portals or terminology, you may reflect them; do not claim a snippet is the full law.",
          "If rules vary by province, say so briefly and give the safest generic steps.",
        ].join("\n"),
      ],
      [
        "human",
        JSON.stringify(
          {
            userMessage: message,
            extractor,
            validator,
            webSearch,
            kb,
            helpfulLinks,
          },
          null,
          2,
        ),
      ],
    ]);

  const baseResponse = {
    extractor,
    validator,
    webSearch,
    navigator: {
      steps: navAndDocs.steps,
      requiredDocuments: navAndDocs.requiredDocuments,
      feesAndTimelines: navAndDocs.feesAndTimelines ?? [],
    },
    documentGenerator: { documents: navAndDocs.documents },
  };

  let urdu: z.infer<typeof UrduTranslationOutputSchema> | undefined;
  const shouldTranslateUrdu =
    process.env.AGENT_ENABLE_URDU === "1" ||
    (!fastMode && process.env.AGENT_ENABLE_URDU !== "0");
  if (shouldTranslateUrdu) {
    try {
      const translated = await llm.withStructuredOutput(UrduTranslationOutputSchema).invoke([
        [
          "system",
          [
            "Translate bureaucracy guidance from English to Urdu (Pakistan).",
            "Keep the same meaning, list order, and markdown structure.",
            "Preserve all URLs exactly as-is and keep placeholders like {{name}} unchanged.",
            "Use natural Urdu in Urdu script, concise and clear.",
            "Output only translated fields in the requested schema.",
          ].join("\n"),
        ],
        [
          "human",
          JSON.stringify(
            {
              intentSummary: baseResponse.extractor.intentSummary,
              steps: baseResponse.navigator.steps,
              requiredDocuments: baseResponse.navigator.requiredDocuments,
              feesAndTimelines: baseResponse.navigator.feesAndTimelines,
              documents: baseResponse.documentGenerator.documents,
            },
            null,
            2,
          ),
        ],
      ]);
      urdu = UrduTranslationOutputSchema.parse(translated);
    } catch {
      urdu = undefined;
    }
  }

  return AgentResponseSchema.parse({
    ...baseResponse,
    urdu,
    clarification,
  });
}

