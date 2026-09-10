import { Link } from "react-router-dom";
import { BrandMark } from "./BrandMark";

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-canvas">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 pb-10 border-b border-border/50">
          <div className="space-y-3">
            <BrandMark compact />
            <p className="text-sm text-text-secondary max-w-xs leading-relaxed">
              Automated PDF grading and evaluation against structured rubrics.
            </p>
          </div>

          <div className="space-y-3">
            <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
              Product
            </p>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>
                <Link to="/#pipeline" className="hover:text-text-primary transition-colors">
                  Grading Pipeline
                </Link>
              </li>
              <li>
                <Link to="/#workflow" className="hover:text-text-primary transition-colors">
                  Evaluation Workflow
                </Link>
              </li>
              <li>
                <Link to="/#stack" className="hover:text-text-primary transition-colors">
                  Technology Stack
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
              Resources
            </p>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>
                <a
                  href="https://github.com/adityasrc/verdict"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-text-primary transition-colors"
                >
                  GitHub Repository
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-text-primary transition-colors">
                  Architecture Overview
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-text-primary transition-colors">
                  Rubric Specification
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
              System
            </p>
            <ul className="space-y-2 text-xs text-text-muted font-mono">
              <li>Engine: Gemini 2.8 Flash</li>
              <li>Parser: Python · PyMuPDF</li>
              <li>Queue: BullMQ + Redis</li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-mono text-xs text-text-muted select-none">
            © {new Date().getFullYear()} Verdict.
          </span>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/adityasrc/verdict"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
