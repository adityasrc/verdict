import React from "react";
import { Sliders, ShieldCheck, Sparkles } from "lucide-react";

export interface WorkflowStepItem {
  step: string;
  title: string;
  description: string;
  detail: string;
}

interface WorkflowStepsProps {
  steps: readonly WorkflowStepItem[];
}

export const WorkflowSteps: React.FC<WorkflowStepsProps> = ({ steps }) => {
  // Feature cards derived from 3 key workflow steps: 01 (Rubric), 02 (PIN), 04 (Gemini Evaluation)
  const featureHighlights = [
    {
      icon: Sliders,
      title: "Rubric Configuration",
      description: "Define weighted criteria and point caps in PostgreSQL so evaluations are strictly scoped and reproducible.",
    },
    {
      icon: ShieldCheck,
      title: "PIN-Gated Submissions",
      description: "Students upload directly to Cloudflare R2 using a 4-digit assignment PIN, triggering an instant grading queue.",
    },
    {
      icon: Sparkles,
      title: "Gemini 2.8 Flash Grading",
      description: "Extracted figures and text are evaluated by Gemini 2.8 Flash to generate structured scores, feedback, and strengths.",
    },
  ];

  return (
    <section id="workflow" className="border-b border-border py-28 md:py-40">
      <div className="max-w-6xl mx-auto px-6 space-y-24">
        <div>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="font-mono text-xs uppercase tracking-wider text-text-muted mb-2">
              Core Capabilities
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-text-primary">
              Engineered for rubric accuracy.
            </h2>
            <p className="text-base md:text-lg text-text-secondary mt-3 leading-relaxed">
              Every stage is logged and visible to both educators and students.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featureHighlights.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="p-6 md:p-8 rounded-xl border border-border bg-surface card-interactive flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-surface-raised border border-border flex items-center justify-center mb-5">
                      <Icon className="w-5 h-5 text-text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-8">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-text-muted mb-1">
                Full Lifecycle
              </p>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-text-primary">
                Detailed Evaluation Workflow
              </h2>
            </div>
            <span className="font-mono text-xs uppercase tracking-wider text-text-muted">
              5 pipeline stages
            </span>
          </div>

          <div className="rounded-xl border border-border bg-surface divide-y divide-border/60 overflow-hidden">
            {steps.map((s) => (
              <div
                key={s.step}
                className="flex gap-6 md:gap-10 p-6 md:p-8 hover:bg-surface-raised/40 transition-colors"
              >
                <span className="font-mono text-xs text-text-muted/60 shrink-0 w-8 pt-1 tabular-nums select-none">
                  {s.step}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-text-primary mb-2">
                    {s.title}
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed max-w-[60ch]">
                    {s.description}
                  </p>
                  <p className="font-mono text-xs uppercase tracking-wider text-text-muted mt-3">
                    {s.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
