import React from "react";

export interface PreviewEventItem {
  step: string;
  label: string;
  status: "info" | "ok" | "done";
}

export type PreviewStatus = PreviewEventItem["status"];

export const dotColor: Record<PreviewStatus, string> = {
  info: "bg-text-muted",
  ok: "bg-text-secondary",
  done: "bg-success",
};

interface PipelinePreviewProps {
  events: readonly PreviewEventItem[];
  stack: readonly string[];
}

export const PipelinePreview: React.FC<PipelinePreviewProps> = ({ events, stack }) => {
  return (
    <section id="pipeline" className="border-b border-border py-28 md:py-40">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-text-muted mb-1">
              Architecture Preview
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-text-primary">
              Pipeline Architecture & Execution
            </h2>
          </div>
          <span className="font-mono text-xs uppercase tracking-wider text-text-muted">
            BullMQ worker · Redis Pub/Sub relay
          </span>
        </div>

        <div className="rounded-xl border border-border bg-surface overflow-hidden card-interactive">
          <div className="border-b border-border bg-surface-raised px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-surface-overlay border border-border/50" />
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-surface-overlay border border-border/50" />
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-surface-overlay border border-border/50" />
              <span className="ml-2 font-mono text-xs text-text-muted">
                grade_assignment · BullMQ worker
              </span>
            </div>
            <span className="font-mono text-xs text-text-muted">
              Socket.io client broadcast
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr]">
            <div className="bg-surface-raised/40 p-6 border-b lg:border-b-0 lg:border-r border-border space-y-5 text-sm">
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-text-muted mb-1">
                  Target Assignment
                </p>
                <p className="font-semibold text-text-primary">
                  CS-301: Distributed Consensus
                </p>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-border/60 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-muted">Max Score</span>
                  <span className="text-text-secondary font-mono">100 pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Access PIN</span>
                  <span className="text-text-primary font-mono font-bold tracking-wider">8492</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Storage</span>
                  <span className="text-text-secondary">Cloudflare R2</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">AI Model</span>
                  <span className="text-text-secondary font-mono">gemini-3.7-flash</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border/60 space-y-2.5">
                <p className="font-mono text-xs uppercase tracking-wider text-text-muted mb-2">
                  Evaluation Criteria
                </p>
                <div className="flex justify-between text-text-secondary text-xs">
                  <span>Raft Protocol Correctness</span>
                  <span className="font-mono text-text-primary">40 pts</span>
                </div>
                <div className="flex justify-between text-text-secondary text-xs">
                  <span>Partition Fault Analysis</span>
                  <span className="font-mono text-text-primary">30 pts</span>
                </div>
                <div className="flex justify-between text-text-secondary text-xs">
                  <span>Benchmark Rigor</span>
                  <span className="font-mono text-text-primary">30 pts</span>
                </div>
              </div>
            </div>

            <div className="bg-canvas p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/60">
                <span className="text-sm font-semibold text-text-primary">
                  Worker Event Stream
                </span>
                <span className="font-mono text-xs text-text-muted">
                  {events.length} pipeline steps
                </span>
              </div>

              <div className="space-y-3 py-1">
                {events.map((ev, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs font-mono">
                    <span className="text-text-muted/40 shrink-0 w-5 text-right tabular-nums pt-0.5 select-none">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${dotColor[ev.status]}`}
                    />
                    <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                      <span className="text-text-primary font-medium text-xs font-sans">
                        {ev.label}
                      </span>
                      <span className="text-text-muted font-mono text-xs uppercase tracking-wider shrink-0">
                        {ev.step}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div id="stack" className="mt-14 pt-8 pb-16 scroll-mt-24 border-t border-border/60">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted text-center mb-4">
            Underlying Infrastructure & Technologies
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs font-mono text-text-secondary">
            {stack.map((tech, i) => (
              <React.Fragment key={tech}>
                <span className="hover:text-text-primary transition-colors">{tech}</span>
                {i < stack.length - 1 && (
                  <span className="text-border select-none">/</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
