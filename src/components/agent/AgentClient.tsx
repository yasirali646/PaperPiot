"use client";

import * as React from "react";
import { z } from "zod";
import { CheckCircle2, Clock3, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AgentResponseSchema } from "@/lib/agent/schemas";
import { buildDraftPdf } from "@/lib/build-draft-pdf";
import { AgentMarkdown } from "@/components/agent/AgentMarkdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type Screen = 1 | 2 | 3;

const WORKFLOW_PHASES = [
  {
    key: "extract",
    title: "Understanding your request",
    detail: "Working out what you’re applying for and what to ask next.",
  },
  {
    key: "research",
    title: "Gathering live context",
    detail: "Searching for Pakistan portals, forms, and practical guidance.",
  },
  {
    key: "validate",
    title: "Checking what’s missing",
    detail: "Spotting gaps in your details and anything risky to flag.",
  },
  {
    key: "generate",
    title: "Building your guide & drafts",
    detail: "Writing steps, document checklist, and copy-ready draft text.",
  },
] as const;

const LIVE_ACTIVITY = [
  "Extracting intent and document type",
  "Checking required fields and missing details",
  "Looking up official portals and practical guidance",
  "Generating step-by-step workflow",
  "Preparing checklist and draft documents",
  "Preparing Urdu translation when available",
] as const;

export function AgentClient() {
  type AgentResult = z.infer<typeof AgentResponseSchema>;
  const [screen, setScreen] = React.useState<Screen>(1);
  const [query, setQuery] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [phaseIndex, setPhaseIndex] = React.useState(0);
  const [progressValue, setProgressValue] = React.useState(0);
  const [elapsedSec, setElapsedSec] = React.useState(0);
  const [result, setResult] = React.useState<AgentResult | null>(null);
  const [clarification, setClarification] = React.useState<
    AgentResult["clarification"] | null
  >(null);
  const [clarificationAnswers, setClarificationAnswers] = React.useState<
    Record<string, string>
  >({});
  const [checkedDocs, setCheckedDocs] = React.useState<Record<string, boolean>>(
    {},
  );

  React.useEffect(() => {
    if (!busy) {
      setPhaseIndex(0);
      setProgressValue(0);
      setElapsedSec(0);
      return;
    }
    const phaseTimer = window.setInterval(() => {
      setPhaseIndex((i) => (i + 1) % WORKFLOW_PHASES.length);
    }, 4800);
    const progressTimer = window.setInterval(() => {
      setProgressValue((p) => (p >= 93 ? 93 : p + 0.4));
    }, 220);
    const elapsedTimer = window.setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);
    return () => {
      window.clearInterval(phaseTimer);
      window.clearInterval(progressTimer);
      window.clearInterval(elapsedTimer);
    };
  }, [busy]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const prompt = query.trim();
    if (!prompt || busy) return;

    let message = prompt;
    if (clarification?.required) {
      const unanswered = clarification.questions.filter(
        (q) => !clarificationAnswers[q]?.trim(),
      );
      if (unanswered.length > 0) {
        toast.error("Please answer all follow-up questions.");
        return;
      }

      const qaBlock = clarification.questions
        .map((q, i) => ({
          index: i + 1,
          question: q,
          answer: clarificationAnswers[q].trim(),
        }));
      message = `${prompt}\n\nStructured details (treat these as confirmed user answers):\n${JSON.stringify(
        qaBlock,
        null,
        2,
      )}`;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const json = await res.json();

      if (!res.ok) {
        const errMsg =
          typeof json?.error === "string" ? json.error : "Request failed.";
        throw new Error(errMsg);
      }

      const parsed = AgentResponseSchema.parse(json);
      if (parsed.clarification.required) {
        setClarification(parsed.clarification);
        setClarificationAnswers((prev) =>
          Object.fromEntries(
            parsed.clarification.questions.map((q) => [q, prev[q] ?? ""]),
          ),
        );
        setResult(null);
        setScreen(1);
        toast.info("Please answer the follow-up questions first.");
        return;
      }

      setClarification(null);
      setClarificationAnswers({});
      setResult(parsed);
      setCheckedDocs(
        Object.fromEntries(
          parsed.navigator.requiredDocuments.map((d) => [d, false]),
        ),
      );
      setScreen(2);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function onDownloadPdf() {
    if (!result) return;
    try {
      buildDraftPdf(result);
      toast.success("PDF downloaded.");
    } catch {
      toast.error("Could not create PDF.");
    }
  }

  const phase = WORKFLOW_PHASES[phaseIndex];
  const hasUrdu = Boolean(result?.urdu);
  const activityIndex = Math.min(
    LIVE_ACTIVITY.length - 1,
    Math.floor(elapsedSec / 7),
  );

  return (
    <>
      <Dialog open={busy} modal disablePointerDismissal onOpenChange={() => {}}>
        <DialogContent
          showCloseButton={false}
          className="overflow-hidden border-white/60 bg-white/80 shadow-2xl backdrop-blur-sm dark:border-white/15 dark:bg-background/85 sm:max-w-md"
        >
          <div className="absolute inset-x-0 top-0 h-1 animate-pulse bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500" />
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border bg-muted/70">
              <Loader2
                className="size-6 animate-spin text-muted-foreground"
                aria-hidden
              />
            </div>
            <DialogTitle className="animate-in fade-in-0 zoom-in-95 text-center duration-300">
              {phase.title}
            </DialogTitle>
            <DialogDescription className="text-center">
              {phase.detail}
            </DialogDescription>
            <p className="text-center text-xs text-muted-foreground tabular-nums">
              {elapsedSec > 0
                ? `${elapsedSec}s elapsed — this can take a few minutes`
                : "Starting…"}
            </p>
          </DialogHeader>
          <div className="space-y-2">
            <Progress value={progressValue} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Step {phaseIndex + 1} of {WORKFLOW_PHASES.length}
              </span>
              <span className="tabular-nums">{Math.round(progressValue)}%</span>
            </div>
          </div>
          <Card size="sm" className="bg-background/70">
            <CardHeader>
              <CardTitle className="text-sm">What is happening now</CardTitle>
              <CardDescription>
                Live behind-the-scenes pipeline while your response is being built.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {WORKFLOW_PHASES.map((step, idx) => {
                  const state =
                    idx < phaseIndex
                      ? "done"
                      : idx === phaseIndex
                        ? "active"
                        : "pending";
                  return (
                    <div
                      key={step.key}
                      className="flex items-start gap-2 rounded-md border bg-background/70 px-3 py-2"
                    >
                      <div className="mt-0.5">
                        {state === "done" ? (
                          <CheckCircle2 className="size-4 text-emerald-600" />
                        ) : state === "active" ? (
                          <Loader2 className="size-4 animate-spin text-primary" />
                        ) : (
                          <Clock3 className="size-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium">{step.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {step.detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="rounded-md border border-dashed bg-background/70 px-3 py-2">
                <p className="mb-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <Sparkles className="size-3" /> Live activity
                </p>
                <p className="text-xs">
                  {LIVE_ACTIVITY[activityIndex]}
                  {busy ? (
                    <span className="inline-flex">
                      <span className="animate-pulse">.</span>
                      <span
                        className="animate-pulse"
                        style={{ animationDelay: "120ms" }}
                      >
                        .
                      </span>
                      <span
                        className="animate-pulse"
                        style={{ animationDelay: "240ms" }}
                      >
                        .
                      </span>
                    </span>
                  ) : null}
                </p>
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>

      <Card className="mx-auto w-full max-w-2xl border-white/50 bg-white/70 shadow-xl backdrop-blur-sm transition-all duration-300 hover:shadow-2xl dark:border-white/10 dark:bg-white/5">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>
            {screen === 1 && "Start"}
            {screen === 2 && "Process & documents"}
            {screen === 3 && "Form preview"}
          </CardTitle>
          {result ? (
            <Badge variant="secondary" className="capitalize">
              {result.extractor.processType}
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { n: 1 as Screen, label: "Ask" },
                { n: 2 as Screen, label: "Steps" },
                { n: 3 as Screen, label: "Preview" },
              ] as const
            ).map(({ n, label }, i) => (
              <React.Fragment key={n}>
                {i > 0 ? (
                  <span className="text-muted-foreground" aria-hidden>
                    →
                  </span>
                ) : null}
                <Badge
                  variant={screen === n ? "default" : "outline"}
                  className={
                    screen === n
                      ? "scale-105 shadow-md transition-transform"
                      : "transition-all duration-300"
                  }
                >
                  {i + 1}. {label}
                </Badge>
              </React.Fragment>
            ))}
          </div>

          {screen === 1 && (
            <form onSubmit={onSubmit} className="animate-in fade-in-0 slide-in-from-bottom-2 space-y-4 duration-300">
              <div className="space-y-2">
                <Label htmlFor="apply-for">
                  What do you want to apply for?
                </Label>
                <Input
                  id="apply-for"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. domicile certificate in Punjab"
                  disabled={busy}
                  autoComplete="off"
                  className="transition-all duration-200 focus-visible:ring-2"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:from-slate-100 dark:via-white dark:to-slate-100"
                disabled={
                  busy ||
                  !query.trim() ||
                  (clarification?.required &&
                    clarification.questions.some(
                      (q) => !clarificationAnswers[q]?.trim(),
                    ))
                }
              >
                {busy ? "Working…" : "Continue"}
              </Button>

              {clarification?.required ? (
                <div className="mt-4 space-y-3 rounded-lg border border-amber-300/70 bg-amber-50/60 p-3 dark:border-amber-800/60 dark:bg-amber-950/20">
                  <p className="text-sm font-medium">Need a few details first</p>
                  <p className="text-sm text-muted-foreground">
                    Please answer each question below.
                  </p>
                  <div className="space-y-3">
                    {clarification.questions.map((question, i) => {
                      const id = `clarification-q-${i}`;
                      return (
                        <div key={`${question}-${i}`} className="space-y-1.5">
                          <Label htmlFor={id}>{question}</Label>
                          <Input
                            id={id}
                            value={clarificationAnswers[question] ?? ""}
                            onChange={(e) =>
                              setClarificationAnswers((prev) => ({
                                ...prev,
                                [question]: e.target.value,
                              }))
                            }
                            placeholder="Type your answer"
                            disabled={busy}
                            autoComplete="off"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </form>
          )}

          {screen === 2 && result && (
            <div className="animate-in fade-in-0 slide-in-from-right-2 space-y-6 duration-300">
              <div>
                {hasUrdu ? (
                  <div className="mb-4 grid gap-3 md:grid-cols-2">
                    <Card size="sm" className="bg-background/70">
                      <CardHeader>
                        <CardTitle className="text-sm">English</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <AgentMarkdown className="[&_p]:mb-0">
                          {result.extractor.intentSummary}
                        </AgentMarkdown>
                      </CardContent>
                    </Card>
                    <Card size="sm" className="bg-background/70" dir="rtl">
                      <CardHeader>
                        <CardTitle className="text-sm">اردو</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <AgentMarkdown className="[&_p]:mb-0 text-right">
                          {result.urdu?.intentSummary ?? ""}
                        </AgentMarkdown>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <AgentMarkdown className="mb-4">
                    {result.extractor.intentSummary}
                  </AgentMarkdown>
                )}
                <p className="mb-2 text-sm font-medium">Steps</p>
                <ScrollArea className="h-[min(44vh,420px)] rounded-xl border bg-background/60 p-3">
                  <ol className="space-y-3">
                    {result.navigator.steps.map((s, i) => (
                      <li
                        key={i}
                        className="rounded-xl border bg-background/80 p-4 shadow-sm transition-all duration-200 hover:shadow-md"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                            {i + 1}
                          </div>
                          <div className="min-w-0 flex-1 space-y-2">
                            {hasUrdu ? (
                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-2">
                                  <p className="text-xs font-medium text-muted-foreground">
                                    English
                                  </p>
                                  <AgentMarkdown className="[&_p]:mb-0 [&_p]:text-foreground [&_strong]:text-foreground">
                                    {s.title}
                                  </AgentMarkdown>
                                  {s.details.trim() ? (
                                    <AgentMarkdown className="[&_p]:mb-0">
                                      {s.details}
                                    </AgentMarkdown>
                                  ) : null}
                                  {s.officeOrPortal &&
                                  s.officeOrPortal !== "N/A" ? (
                                    <p className="text-xs text-muted-foreground">
                                      {s.officeOrPortal}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="space-y-2 text-right" dir="rtl">
                                  <p className="text-xs font-medium text-muted-foreground">
                                    اردو
                                  </p>
                                  <AgentMarkdown className="[&_p]:mb-0 [&_p]:text-foreground [&_strong]:text-foreground">
                                    {result.urdu?.steps[i]?.title ?? ""}
                                  </AgentMarkdown>
                                  <AgentMarkdown className="[&_p]:mb-0">
                                    {result.urdu?.steps[i]?.details ?? ""}
                                  </AgentMarkdown>
                                  {result.urdu?.steps[i]?.officeOrPortal &&
                                  result.urdu.steps[i]?.officeOrPortal !==
                                    "N/A" ? (
                                    <p className="text-xs text-muted-foreground">
                                      {result.urdu.steps[i]?.officeOrPortal}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            ) : (
                              <>
                                <AgentMarkdown className="[&_p]:mb-0 [&_p]:text-foreground [&_strong]:text-foreground">
                                  {s.title}
                                </AgentMarkdown>
                                {s.details.trim() ? (
                                  <AgentMarkdown className="[&_p]:mb-0">
                                    {s.details}
                                  </AgentMarkdown>
                                ) : null}
                                {s.officeOrPortal &&
                                s.officeOrPortal !== "N/A" ? (
                                  <p className="text-xs text-muted-foreground">
                                    {s.officeOrPortal}
                                  </p>
                                ) : null}
                              </>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </ScrollArea>
                {result.navigator.feesAndTimelines.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <Card size="sm" className="bg-background/65">
                      <CardHeader>
                        <CardTitle className="text-sm">
                          Fees & timelines
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {result.navigator.feesAndTimelines.map((t, i) => (
                          <div
                            key={i}
                            className="rounded-lg border bg-background/80 p-3"
                          >
                            {hasUrdu ? (
                              <div className="grid gap-3 md:grid-cols-2">
                                <AgentMarkdown className="[&_p]:mb-0 [&_p]:leading-7">
                                  {t}
                                </AgentMarkdown>
                                <div dir="rtl">
                                  <AgentMarkdown className="[&_p]:mb-0 [&_p]:leading-7 text-right">
                                    {result.urdu?.feesAndTimelines[i] ?? ""}
                                  </AgentMarkdown>
                                </div>
                              </div>
                            ) : (
                              <AgentMarkdown className="[&_p]:mb-0 [&_p]:leading-7">
                                {t}
                              </AgentMarkdown>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Required documents</p>
                <Card size="sm" className="bg-background/65">
                  <CardContent className="pt-6">
                    <ul className="space-y-3">
                      {result.navigator.requiredDocuments.map((name, i) => (
                        <li key={name} className="flex items-start gap-3">
                          <Checkbox
                            id={`doc-${encodeURIComponent(name)}`}
                            checked={checkedDocs[name] ?? false}
                            onCheckedChange={(v) =>
                              setCheckedDocs((prev) => ({
                                ...prev,
                                [name]: v === true,
                              }))
                            }
                            className="mt-0.5"
                          />
                          <Label
                            htmlFor={`doc-${encodeURIComponent(name)}`}
                            className="cursor-pointer font-normal leading-snug"
                          >
                            {hasUrdu ? (
                              <div className="grid gap-2 md:grid-cols-2">
                                <AgentMarkdown className="[&_p]:mb-0 [&_p]:inline">
                                  {name}
                                </AgentMarkdown>
                                <div dir="rtl">
                                  <AgentMarkdown className="[&_p]:mb-0 [&_p]:inline text-right">
                                    {result.urdu?.requiredDocuments[i] ?? ""}
                                  </AgentMarkdown>
                                </div>
                              </div>
                            ) : (
                              <AgentMarkdown className="[&_p]:mb-0 [&_p]:inline">
                                {name}
                              </AgentMarkdown>
                            )}
                          </Label>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setScreen(1);
                    setResult(null);
                    setClarification(null);
                    setClarificationAnswers({});
                    setQuery("");
                  }}
                >
                  Start over
                </Button>
                <Button type="button" onClick={() => setScreen(3)}>
                  Form preview
                </Button>
              </div>
            </div>
          )}

          {screen === 3 && result && (
            <div className="animate-in fade-in-0 slide-in-from-left-2 space-y-4 duration-300">
              <ScrollArea className="h-[min(52vh,420px)] rounded-md border bg-background/60 p-4">
                <div className="space-y-6">
                  {result.documentGenerator.documents.map((d, i) => (
                    <div key={i}>
                      {hasUrdu ? (
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <p className="font-medium">{d.name}</p>
                            <AgentMarkdown className="mt-2">
                              {d.content?.trim() ||
                                "No draft text was returned for this section."}
                            </AgentMarkdown>
                          </div>
                          <div dir="rtl" className="text-right">
                            <p className="font-medium">
                              {result.urdu?.documents[i]?.name ?? "اردو"}
                            </p>
                            <AgentMarkdown className="mt-2 text-right">
                              {result.urdu?.documents[i]?.content?.trim() ?? ""}
                            </AgentMarkdown>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="font-medium">{d.name}</p>
                          <AgentMarkdown className="mt-2">
                            {d.content?.trim() ||
                              "No draft text was returned for this section."}
                          </AgentMarkdown>
                        </>
                      )}
                      {i < result.documentGenerator.documents.length - 1 ? (
                        <Separator className="mt-6" />
                      ) : null}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setScreen(2)}
                >
                  Back
                </Button>
                <Button type="button" onClick={onDownloadPdf}>
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
