import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";

// Pipeline steps derived from SubmissionWorker.ts and python.service.ts
const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Rubric configuration",
    description:
      "Define named criteria and point allocations. Evaluations are strictly scoped to these criteria. A submission cannot be graded without an attached rubric.",
    detail: "Weighted criteria · stored in PostgreSQL",
  },
  {
    step: "02",
    title: "PIN-gated submission",
    description:
      "Students upload a PDF using a 4-digit access PIN tied to the assignment. The file is stored on Cloudflare R2 and a grading job is queued immediately.",
    detail: "Cloudflare R2 · presigned upload",
  },
  {
    step: "03",
    title: "Async PDF parsing",
    description:
      "A BullMQ worker downloads the PDF and runs a Python script (pdfParser.py using PyMuPDF) that extracts text and images page by page. Progress events are pushed to connected clients in real time.",
    detail: "BullMQ · Python · PyMuPDF",
  },
  {
    step: "04",
    title: "Gemini evaluation",
    description:
      "The extracted content and rubric are sent to geminiGrader.py, which calls Gemini and returns a structured result: score, per-criterion feedback, strengths, and weaknesses.",
    detail: "Gemini 3.8 Flash · structured JSON output",
  },
  {
    step: "05",
    title: "Results & export",
    description:
      "Scores and feedback are saved to the database. Teachers can review submissions, adjust scores manually, and export the full class gradebook as a CSV.",
    detail: "Score · feedback · CSV export",
  },
];

// Static preview of the real event stream.
// Steps map to actual publishEvent() calls in SubmissionWorker.ts and python scripts.
const PREVIEW_EVENTS = [
  { step: "submission_started",  label: "Job queued · status set to EVALUATING",   status: "info" },
  { step: "downloading_pdf",     label: "Downloading PDF from Cloudflare R2…",      status: "info" },
  { step: "pdf_downloaded",      label: "PDF saved to worker disk",                 status: "ok"   },
  { step: "parsing_started",     label: "Opening PDF with PyMuPDF…",               status: "info" },
  { step: "page_parsed",         label: "Pages extracted (text + images)",          status: "ok"   },
  { step: "parsing_completed",   label: "Extraction done · passing to Gemini",      status: "ok"   },
  { step: "gemini_started",      label: "Calling Gemini with rubric context…",      status: "info" },
  { step: "gemini_processing",   label: "Waiting for structured response…",         status: "info" },
  { step: "gemini_completed",    label: "Evaluation received",                      status: "ok"   },
  { step: "grading_completed",   label: "Score saved · status set to GRADED",       status: "done" },
] as const;

const STACK = [
  "React + Vite",
  "Express + TypeScript",
  "PostgreSQL + Prisma",
  "BullMQ + Redis",
  "Gemini 3.8 Flash",
  "Cloudflare R2",
  "Socket.io",
  "Python (PyMuPDF)",
];

const dotColor: Record<string, string> = {
  info: "bg-text-muted",
  ok:   "bg-text-secondary",
  done: "bg-success",
};

const Onboarding = () => {
  return (
    <div className="bg-canvas text-text-primary">

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 pt-24 pb-16 md:pt-36 md:pb-24">
          <h1 className="font-semibold tracking-tight leading-[1.1]">
            <span className="block text-[52px] sm:text-[64px] text-text-primary">
              Grade PDF submissions
            </span>
            <span className="block text-[52px] sm:text-[64px] text-text-primary/60">
              against any rubric you define.
            </span>
          </h1>

          <p className="text-body-lg text-text-secondary max-w-[50ch] mt-6 leading-relaxed">
            Configure criteria, accept PIN-gated student submissions, and let
            Gemini evaluate and score each one, automatically.
          </p>

          <div className="flex flex-wrap gap-3 mt-9">
            <Button asChild variant="default" size="default">
              <Link to="/signup">
                Get Started
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="default">
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>


      {/* ── Pipeline Preview ─────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-14 md:py-16">
          <p className="font-mono text-mono-sm text-text-muted uppercase tracking-wider mb-6">
            Grading pipeline · static preview
          </p>

          <div className="rounded-xl border border-border bg-surface shadow-elevated overflow-hidden">
            {/* Title bar */}
            <div className="border-b border-border bg-surface-raised px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-surface-overlay" />
                <span className="h-2.5 w-2.5 rounded-full bg-surface-overlay" />
                <span className="h-2.5 w-2.5 rounded-full bg-surface-overlay" />
                <span className="ml-2.5 font-mono text-mono-sm text-text-muted">
                  grade_assignment · BullMQ worker
                </span>
              </div>
              <span className="font-mono text-mono-sm text-text-muted">
                submission_events:&lt;id&gt;
              </span>
            </div>

            {/* Two-pane layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr]">
              {/* Left: assignment metadata */}
              <aside className="border-b lg:border-b-0 lg:border-r border-border bg-canvas/50 p-5 space-y-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted mb-1">
                    Assignment
                  </p>
                  <p className="text-body-sm font-semibold text-text-primary">
                    CS-301: Distributed Systems
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-border/60 font-mono text-mono-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Max score</span>
                    <span className="text-text-secondary">100 pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Access PIN</span>
                    <span className="text-text-secondary">8492</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Storage</span>
                    <span className="text-text-secondary">Cloudflare R2</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Concurrency</span>
                    <span className="text-text-secondary">1</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60 font-mono text-mono-sm space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted mb-2">
                    Rubric criteria
                  </p>
                  <div className="flex justify-between text-text-secondary">
                    <span>Architecture Analysis</span>
                    <span>40 pts</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Failure Handling</span>
                    <span>30 pts</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Clarity &amp; Citations</span>
                    <span>30 pts</span>
                  </div>
                </div>
              </aside>

              {/* Right: event stream */}
              <div className="p-5 bg-surface">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
                  <span className="text-body-sm font-medium text-text-primary">
                    Event stream
                  </span>
                  <span className="font-mono text-mono-sm text-text-muted">
                    Redis Pub/Sub · Socket.io relay
                  </span>
                </div>

                <div className="bg-canvas rounded-lg border border-border p-4 font-mono text-mono-sm space-y-2">
                  {PREVIEW_EVENTS.map((ev, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-text-muted/40 shrink-0 w-5 text-right tabular-nums pt-0.5">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={"mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 " + dotColor[ev.status]}
                      />
                      <div className="min-w-0">
                        <span className="text-text-muted text-[10px] uppercase tracking-wider block mb-0.5">
                          {ev.step}
                        </span>
                        <span
                          className={
                            ev.status === "done"
                              ? "text-text-primary"
                              : "text-text-secondary"
                          }
                        >
                          {ev.label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Stack strip: compact and secondary */}
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5">
            {STACK.map((tech) => (
              <span key={tech} className="font-mono text-mono-sm text-text-muted">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Workflow ─────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-14 md:py-16">
          <p className="font-mono text-mono-sm text-text-muted uppercase tracking-wider mb-8">
            Workflow
          </p>

          <div className="space-y-0">
            {WORKFLOW_STEPS.map((s, i) => (
              <div
                key={s.step}
                className={
                  "flex gap-6 md:gap-10 py-6 " +
                  (i < WORKFLOW_STEPS.length - 1 ? "border-b border-border/60" : "")
                }
              >
                <span className="font-mono text-mono-sm text-text-muted/50 shrink-0 w-6 pt-0.5 tabular-nums">
                  {s.step}
                </span>
                <div className="min-w-0">
                  <p className="text-body-sm font-semibold text-text-primary mb-1.5">
                    {s.title}
                  </p>
                  <p className="text-body-sm text-text-secondary leading-relaxed max-w-[60ch]">
                    {s.description}
                  </p>
                  <p className="font-mono text-mono-sm text-text-muted mt-3">
                    {s.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-14 md:py-16">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 border border-border rounded-xl bg-surface p-7 card-glow">
          <div>
            <p className="text-body-md font-semibold text-text-primary">
              Ready to run your first evaluation?
            </p>
            <p className="text-body-sm text-text-secondary mt-1">
              Create a rubric, share the PIN, and the pipeline handles the rest.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Button asChild variant="default" size="sm">
              <Link to="/signup">Create Account</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Onboarding;
