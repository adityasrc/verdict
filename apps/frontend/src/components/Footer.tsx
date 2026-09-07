import { BrandMark } from "./BrandMark";

export const Footer = () => {
  return (
    <footer className="border-t border-border">
      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <BrandMark compact />

        <div className="flex items-center gap-6">
          <a
            href="https://github.com/adityasrc/verdict"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-mono-sm text-text-muted hover:text-text-secondary underline underline-offset-2 decoration-text-muted/40 hover:decoration-text-secondary/40 transition-colors"
          >
            GitHub
          </a>
          <span className="font-mono text-mono-sm text-text-muted/60 select-none">
            © {new Date().getFullYear()} Verdict.
          </span>
        </div>
      </div>
    </footer>
  );
};
