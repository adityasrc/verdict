import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Hero } from "./Hero";
import { WorkflowSteps } from "./WorkflowSteps";
import { PipelinePreview } from "./PipelinePreview";
import { Cta } from "./Cta";

// Pipeline steps derived directly from submissionWorker.ts and python.service.ts
export const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Rubric configuration",
    description:
      "Choose named criteria and point caps. Each returned score is checked against its cap, and the server calculates the final grade. A rubric is required.",
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
      "A BullMQ worker downloads the PDF and runs a Python script (pdfParser.py using PyMuPDF) that extracts text and embedded images page by page. Progress events are published via Redis.",
    detail: "BullMQ · Python · PyMuPDF",
  },
  {
    step: "04",
    title: "Gemini evaluation",
    description:
      "The extracted content and rubric go to Gemini 3.8 Flash. It suggests a score and feedback for each criterion; the server checks the scores and calculates the final grade.",
    detail: "Gemini 3.8 Flash · structured JSON output",
  },
  {
    step: "05",
    title: "Results & export",
    description:
      "Scores and feedback are saved to the database. Teachers can review submissions and export scores to a CSV file.",
    detail: "Score · feedback · CSV export",
  },
] as const;

// Example event sequence emitted by submissionWorker.ts and the Python scripts.
export const PREVIEW_EVENTS = [
  { step: "submission_started", label: "Job queued · status set to EVALUATING", status: "info" as const },
  { step: "downloading_pdf", label: "Downloading PDF from Cloudflare R2…", status: "info" as const },
  { step: "pdf_downloaded", label: "PDF saved to worker disk", status: "ok" as const },
  { step: "parsing_started", label: "Opening PDF with PyMuPDF…", status: "info" as const },
  { step: "page_parsed", label: "Pages extracted (text + images)", status: "ok" as const },
  { step: "parsing_completed", label: "Extraction done · passing to Gemini 3.8 Flash", status: "ok" as const },
  { step: "gemini_started", label: "Calling Gemini 3.8 Flash with rubric context…", status: "info" as const },
  { step: "gemini_processing", label: "Waiting for structured response…", status: "info" as const },
  { step: "gemini_completed", label: "Evaluation received", status: "ok" as const },
  { step: "grading_completed", label: "Score saved · status set to GRADED", status: "done" as const },
] as const;

export const STACK = [
  "React + Vite",
  "Express + TypeScript",
  "PostgreSQL + Prisma",
  "BullMQ + Redis",
  "Gemini Flash",
  "Cloudflare R2",
  "Socket.io",
  "Python (PyMuPDF)",
] as const;

const Onboarding = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      el?.scrollIntoView({ behavior: "smooth" });
    }
  }, [location.hash]);

  return (
    <div className="bg-canvas text-text-primary">
      <Hero />

      <WorkflowSteps steps={WORKFLOW_STEPS} />

      <PipelinePreview events={PREVIEW_EVENTS} stack={STACK} />

      <Cta />
    </div>
  );
};

export default Onboarding;
