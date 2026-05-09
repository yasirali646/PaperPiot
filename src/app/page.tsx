import { AgentClient } from "@/components/agent/AgentClient";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  return (
    <div className="relative flex min-h-full flex-1 overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/70 dark:from-background dark:via-background dark:to-indigo-950/30">
      <div className="pointer-events-none absolute inset-0">
        <div className="animated-orb absolute -top-20 left-[-4rem] h-56 w-56 bg-sky-400/20" />
        <div className="animated-orb-delay absolute right-[-5rem] top-40 h-72 w-72 bg-violet-400/20" />
        <div className="animated-orb absolute bottom-[-7rem] left-1/3 h-72 w-72 bg-indigo-400/15" />
      </div>
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 md:px-8 md:py-14">
        <Card className="fade-up mx-auto w-full max-w-2xl border-white/50 bg-white/70 shadow-xl backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <CardHeader className="gap-4 text-center">
            <div>
              <Badge
                variant="secondary"
                className="rounded-full border bg-background/80 px-3 py-1 uppercase tracking-[0.2em]"
              >
                Pakistan
              </Badge>
            </div>
            <CardTitle className="bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 bg-clip-text text-3xl tracking-tight text-transparent dark:from-slate-50 dark:via-slate-200 dark:to-slate-50 md:text-5xl">
              PaperPilot AI
            </CardTitle>
            <CardDescription className="mx-auto max-w-lg text-base leading-relaxed">
              Steps, checklists, and draft text for common Pakistan paperwork.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4 bg-gradient-to-r from-transparent via-border to-transparent" />
            <p className="text-center text-sm text-muted-foreground">
              Start by describing what you need to apply for, then review your
              process plan and generated drafts.
            </p>
          </CardContent>
        </Card>
        <div className="fade-up-delayed">
          <AgentClient />
        </div>
      </main>
    </div>
  );
}
