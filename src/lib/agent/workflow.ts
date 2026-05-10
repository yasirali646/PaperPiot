import { z, type ZodType } from "zod";
import type { BaseMessageLike } from "@langchain/core/messages";
import { getLLM } from "@/lib/agent/llm";
import { parseTimeoutMs, withTimeout } from "@/lib/agent/timeouts";
import { getKbForProcessType } from "@/lib/knowledgebase/pakistan";
import {
  AgentResponseSchema,
  ClarificationOutputSchema,
  FullOutputSchema,
  ProcessTypeSchema,
} from "@/lib/agent/schemas";
import type { OnPhase } from "@/lib/agent/stream-events";

const UserInputSchema = z.object({
  message: z.string().min(1),
});

const MAX_PARSE_RETRIES = 2;

async function structuredInvoke<T>(
  llm: ReturnType<typeof getLLM>,
  schema: ZodType<T>,
  messages: BaseMessageLike[],
  timeoutMs: number,
  label: string,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_PARSE_RETRIES; attempt++) {
    try {
      const raw = await withTimeout(
        llm.withStructuredOutput(schema, { method: "jsonMode" }).invoke(messages),
        timeoutMs,
        label,
      );
      return schema.parse(raw);
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isParseFailure =
        /failed to parse|unexpected end of json|output_parsing_failure/i.test(msg);
      if (!isParseFailure || attempt === MAX_PARSE_RETRIES) break;
    }
  }
  throw lastError;
}

export type RunAgentWorkflowInput = z.infer<typeof UserInputSchema> & {
  onPhase?: OnPhase;
};

type HelpfulLink = { name: string; url: string; note?: string };
const SERVERLESS_MAX_RUNTIME_MS = 300_000;
const SERVERLESS_TIMEOUT_SAFETY_BUFFER_MS = 30_000;
const DEFAULT_WORKFLOW_BUDGET_MS =
  SERVERLESS_MAX_RUNTIME_MS - SERVERLESS_TIMEOUT_SAFETY_BUFFER_MS;

function detectProcessType(message: string): z.infer<typeof ProcessTypeSchema> {
  const lower = message.toLowerCase();
  if (/\b(domicile|proof of domicile)\b/.test(lower)) return "domicile";
  if (/\b(passport|dgip|travel document)\b/.test(lower)) return "passport";
  if (/\b(university|degree|hec|transcript|admission|enrollment)\b/.test(lower))
    return "university";
  return "other";
}

function buildHelpfulLinks(input: {
  kb: { officialPortals: Array<{ name: string; url?: string; note?: string }> } | null;
}): HelpfulLink[] {
  const out: HelpfulLink[] = [];
  if (input.kb) {
    for (const p of input.kb.officialPortals) {
      if (!p.url) continue;
      out.push({ name: p.name, url: p.url, note: p.note });
    }
  }
  const seen = new Set<string>();
  return out.filter((l) => {
    const key = l.url.trim().toLowerCase();
    if (!key) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
  processType: string;
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

  if (input.processType === "domicile") {
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

  if (input.processType === "passport" && !hasPassportCategory) {
    addMissingQuestion(
      missingFields,
      questions,
      "passport category",
      "Is this a new passport, renewal, or replacement for a lost/stolen passport?",
    );
  }
  if (
    input.processType === "passport" &&
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

  if (
    ["other", "university"].includes(input.processType) &&
    !hasProvince
  ) {
    addMissingQuestion(
      missingFields,
      questions,
      "province",
      "Which province is this application for?",
    );
  }

  const shortPrompt = input.userMessage.trim().split(/\s+/).length <= 7;
  if (!hasStructuredAnswers && shortPrompt && questions.length === 0) {
    pushUnique(
      questions,
      "Which city/province is this for, and what documents do you already have?",
    );
  }

  const mustClarify = questions.length > 0;

  return ClarificationOutputSchema.parse({
    required: mustClarify,
    missingFields: mustClarify ? missingFields.slice(0, 6) : [],
    questions: mustClarify ? questions.slice(0, 4) : [],
  });
}

export async function runAgentWorkflow(input: RunAgentWorkflowInput) {
  const configuredCapMs = parseTimeoutMs(
    process.env.AGENT_WORKFLOW_TIMEOUT_MS,
    900_000,
    1_800_000,
  );
  const runtimeBudgetMs = parseTimeoutMs(
    process.env.AGENT_RUNTIME_BUDGET_MS,
    DEFAULT_WORKFLOW_BUDGET_MS,
    SERVERLESS_MAX_RUNTIME_MS,
  );
  const capMs = Math.min(configuredCapMs, runtimeBudgetMs);
  return withTimeout(runAgentWorkflowInner(input), capMs, "Agent workflow");
}

async function runAgentWorkflowInner(input: RunAgentWorkflowInput) {
  const { message, onPhase } = input;
  UserInputSchema.parse({ message });

  const processType = detectProcessType(message);
  const kb = getKbForProcessType(processType);
  const helpfulLinks = buildHelpfulLinks({ kb });

  const clarification = buildClarification({
    userMessage: message,
    processType,
  });

  onPhase?.("extract", { processType, clarification });

  if (clarification.required) {
    const finalResult = AgentResponseSchema.parse({
      processType,
      intentSummary: `${processType} application process`,
      navigator: {
        steps: [{ title: "Provide details", details: "Answer the clarification questions to proceed.", officeOrPortal: "N/A" }],
        requiredDocuments: kb?.requiredDocuments ?? ["CNIC"],
        feesAndTimelines: [],
      },
      documentGenerator: { documents: [{ name: "Pending", content: "Please answer the follow-up questions first." }] },
      clarification,
    });
    onPhase?.("complete", finalResult);
    return finalResult;
  }

  const llm = getLLM();
  const navStepTimeoutMs = parseTimeoutMs(
    process.env.AGENT_NAV_STEP_TIMEOUT_MS,
    180_000,
    270_000,
  );

  const systemPrompt = [
    "You are PaperPilot, a Pakistan bureaucracy assistant. You MUST respond with a JSON object (no markdown fences, just raw JSON).",
    "",
    "Required JSON structure:",
    '{',
    '  "intentSummary": "1-2 sentence summary of what the user needs",',
    '  "steps": [{"title": "Step title", "details": "Detailed instructions (2+ sentences, include URLs)", "officeOrPortal": "Office name or portal URL"}],',
    '  "requiredDocuments": ["Document 1", "Document 2", ...],',
    '  "feesAndTimelines": ["Fee/timeline info 1", ...],',
    '  "documents": [{"name": "Document title", "content": "FULL multi-paragraph draft with {{placeholders}}"}]',
    '}',
    "",
    "CRITICAL RULES:",
    "- Every string field MUST contain real, substantive content (at least 10+ words). NEVER use '...' or placeholder text.",
    "- `steps` must have 3-7 steps with detailed instructions.",
    "- `requiredDocuments` must list all needed documents (typically 4-8 items).",
    "- `documents` must contain COMPLETE draft letters/applications with multiple paragraphs, proper formatting, and {{placeholder}} fields for user data.",
    "- Use Markdown in content fields (bold, lists, line breaks).",
    "- Include portal URLs from helpfulLinks where relevant.",
    "- If rules vary by province, say so and give safest generic steps.",
  ].join("\n");

  const output = await structuredInvoke(
    llm,
    FullOutputSchema,
    [
      ["system", systemPrompt],
      [
        "human",
        JSON.stringify({ userMessage: message, processType, kb, helpfulLinks }, null, 2),
      ],
    ],
    navStepTimeoutMs,
    "Generate step",
  );

  onPhase?.("generate", {
    stepsCount: output.steps.length,
    documentsCount: output.documents.length,
    requiredDocumentsCount: output.requiredDocuments.length,
  });

  const finalResult = AgentResponseSchema.parse({
    processType,
    intentSummary: output.intentSummary,
    navigator: {
      steps: output.steps,
      requiredDocuments: output.requiredDocuments,
      feesAndTimelines: output.feesAndTimelines ?? [],
    },
    documentGenerator: { documents: output.documents },
    clarification,
  });
  onPhase?.("complete", finalResult);
  return finalResult;
}
