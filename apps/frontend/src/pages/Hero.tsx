import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "../components/ui/button";

export const Hero: React.FC = () => {
  return (
    <section className="border-b border-border py-28 md:py-40">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          <h1 className="text-6xl md:text-7xl font-semibold tracking-tight text-text-primary leading-[1.08] [text-wrap:balance]">
            Automated PDF grading against structured rubrics.
          </h1>

          <p className="text-base md:text-lg text-text-secondary leading-relaxed max-w-[60ch] mt-6 [text-wrap:balance]">
            Configure weighted criteria, distribute 4-digit access PINs, and let
            Gemini 2.8 Flash evaluate and score student submissions with rubric-based feedback.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <Button asChild variant="default" size="lg">
              <Link to="/signup">
                Get Started
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
        </div>

        <div className="mt-14 max-w-5xl mx-auto">
          <div className="rounded-xl border border-border bg-surface shadow-elevated overflow-hidden card-interactive">
            <div className="border-b border-border bg-surface-raised px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-surface-overlay border border-border/60" />
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-surface-overlay border border-border/60" />
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-surface-overlay border border-border/60" />
                <span className="ml-2 font-mono text-xs text-text-muted">
                  verdict · grading evaluation session
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-success font-medium px-2 py-0.5 rounded bg-success-muted border border-success/20">
                  PIPELINE COMPLETE
                </span>
              </div>
            </div>

            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 bg-canvas">
              <div className="md:col-span-5 space-y-4">
                <div className="p-5 rounded-xl border border-border bg-surface-raised/40 space-y-2">
                  <span className="font-mono text-xs uppercase tracking-wider text-text-muted">
                    Assessment Result
                  </span>
                  <h3 className="text-base font-semibold text-text-primary">
                    CS-301: Distributed Consensus
                  </h3>
                  <div className="pt-2 flex items-baseline gap-2 font-mono">
                    <span className="text-4xl font-bold text-text-primary tracking-tight">
                      94
                    </span>
                    <span className="text-sm text-text-muted">/ 100 PTS</span>
                  </div>
                  <p className="text-xs text-text-secondary pt-1">
                    Status: <strong className="text-success font-semibold">Graded</strong> · Evaluated by Gemini 2.8 Flash
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-surface space-y-2.5">
                  <span className="font-mono text-xs uppercase tracking-wider text-text-muted block">
                    Criteria Breakdown
                  </span>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-text-secondary">Raft Protocol Correctness</span>
                      <span className="font-mono text-text-primary font-medium">38 / 40</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-text-secondary">Partition Fault Analysis</span>
                      <span className="font-mono text-text-primary font-medium">28 / 30</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-text-secondary">Benchmark Rigor</span>
                      <span className="font-mono text-text-primary font-medium">28 / 30</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-7 p-6 rounded-xl border border-border bg-surface flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                    <span className="text-sm font-semibold text-text-primary">
                      Grading Progress
                    </span>
                    <span className="font-mono text-xs text-text-muted">
                      4 / 4 Stages
                    </span>
                  </div>

                  <div className="relative space-y-4">
                    <div className="absolute left-4 top-4 bottom-4 w-0.5 -translate-x-1/2 bg-border border-l-2 border-border pointer-events-none" />

                    <div className="relative flex items-center gap-4">
                      <div className="relative z-10 w-8 h-8 rounded-full bg-success text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text-primary">Upload</p>
                        <p className="text-xs text-text-secondary">PDF received and queued via Cloudflare R2</p>
                      </div>
                    </div>

                    <div className="relative flex items-center gap-4">
                      <div className="relative z-10 w-8 h-8 rounded-full bg-success text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text-primary">Parsing PDF</p>
                        <p className="text-xs text-text-secondary">12 of 12 pages and figures extracted via PyMuPDF</p>
                      </div>
                    </div>

                    <div className="relative flex items-center gap-4">
                      <div className="relative z-10 w-8 h-8 rounded-full bg-success text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text-primary">AI Evaluation</p>
                        <p className="text-xs text-text-secondary">Criteria evaluation received from Gemini 2.8 Flash</p>
                      </div>
                    </div>

                    <div className="relative flex items-center gap-4">
                      <div className="relative z-10 w-8 h-8 rounded-full bg-success text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text-primary">Graded</p>
                        <p className="text-xs text-text-secondary">Score recorded · gradebook updated</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-border flex items-center justify-between text-xs text-text-muted font-mono">
                  <span>Fast, streamed evaluation</span>
                  <span>Model: gemini-2.8-flash</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
