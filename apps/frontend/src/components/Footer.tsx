import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="bg-on-surface text-surface border-t-[4px] border-on-surface">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="font-label-mono text-[12px] text-surface-variant uppercase font-bold">
          © {new Date().getFullYear()} Verdict. Built for educators.
        </p>
        <nav className="flex items-center gap-6 font-label-caps uppercase font-bold">
          <Link to="/" className="text-surface hover:text-secondary-fixed transition-colors">
            Home
          </Link>
          <a
            href="https://github.com/adityasrc/verdict"
            target="_blank"
            rel="noopener noreferrer"
            className="text-surface hover:text-secondary-fixed transition-colors"
          >
            GitHub
          </a>
          <Link to="/login" className="text-surface hover:text-secondary-fixed transition-colors">
            Sign In
          </Link>
        </nav>
      </div>
    </footer>
  );
};