import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";

export const Cta: React.FC = () => {
  return (
    <section className="py-28 md:py-40">
      <div className="max-w-6xl mx-auto px-6">
        <div className="rounded-xl border border-border bg-surface-raised/40 p-10 md:p-14 flex flex-col md:flex-row md:items-center justify-between gap-8 card-interactive">
          <div className="space-y-2">
            <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
              Get Started
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-text-primary">
              Ready to evaluate submissions?
            </h2>
            <p className="text-base md:text-lg text-text-secondary leading-relaxed max-w-[60ch]">
              Configure your rubric, distribute the access PIN, and monitor automated grading in real time.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button asChild variant="default" size="lg">
              <Link to="/signup">
                Create Account
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
