import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-7xl px-6 py-16 text-center">
        <h2 className="text-2xl font-semibold tracking-tight mb-3 text-foreground">
          Ready to save time?
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto text-sm leading-relaxed">
          Start grading assignments with AI and focus on what matters most — teaching.
        </p>
        <Link
          to="/signup"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 h-11"
        >
          Get Started
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
      <div className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Verdict. Built for educators.
      </div>
    </footer>
  );
};