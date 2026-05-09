"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

type AgentMarkdownProps = {
  children: string;
  className?: string;
};

export function AgentMarkdown({ children, className }: AgentMarkdownProps) {
  return (
    <div className={cn("agent-md text-sm leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: (props) => (
            <p
              className="mb-2 last:mb-0 text-muted-foreground"
              {...props}
            />
          ),
          strong: (props) => (
            <strong className="font-semibold text-foreground" {...props} />
          ),
          em: (props) => (
            <em className="italic text-muted-foreground" {...props} />
          ),
          ul: (props) => (
            <ul
              className="my-2 list-disc space-y-1 pl-4 text-muted-foreground"
              {...props}
            />
          ),
          ol: (props) => (
            <ol
              className="my-2 list-decimal space-y-1 pl-4 text-muted-foreground"
              {...props}
            />
          ),
          li: (props) => <li className="leading-relaxed" {...props} />,
          h1: (props) => (
            <h3
              className="mb-2 mt-3 text-base font-semibold text-foreground first:mt-0"
              {...props}
            />
          ),
          h2: (props) => (
            <h3
              className="mb-2 mt-3 text-base font-semibold text-foreground first:mt-0"
              {...props}
            />
          ),
          h3: (props) => (
            <h4
              className="mb-1.5 mt-2 text-sm font-semibold text-foreground first:mt-0"
              {...props}
            />
          ),
          code: (props) => {
            const { children: c, className: codeClass } = props;
            const isBlock = /language-/.test(String(codeClass || ""));
            if (isBlock) {
              return (
                <code
                  className={cn(
                    "my-2 block w-full overflow-x-auto rounded-md bg-muted p-3 font-mono text-[0.85em] text-foreground",
                    codeClass,
                  )}
                >
                  {c}
                </code>
              );
            }
            return (
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground">
                {c}
              </code>
            );
          },
          pre: (props) => (
            <pre className="my-2 overflow-x-auto rounded-md bg-muted p-3 text-[0.85em] text-foreground">
              {props.children}
            </pre>
          ),
          a: (props) => (
            <a
              className="font-medium text-primary underline underline-offset-2 hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          blockquote: (props) => (
            <blockquote
              className="my-2 border-l-2 border-primary/40 pl-3 italic text-muted-foreground"
              {...props}
            />
          ),
          hr: () => <hr className="my-4 border-border" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
