import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="bg-surface text-on-surface border-t-[4px] border-on-surface">
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
          <div className="flex items-center gap-3">
            <div className="bg-primary border-[4px] border-on-surface brutal-shadow flex items-center justify-center p-1.5">
              <span className="material-symbols-outlined text-on-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
            </div>
            <span className="font-headline-md text-lg font-black uppercase tracking-tighter text-on-surface">
              Verdict
            </span>
          </div>
          <p className="font-label-mono text-[12px] text-on-surface-variant uppercase font-bold text-center md:text-left">
            © {new Date().getFullYear()} Verdict. Built for educators.
          </p>
        </div>
        <nav className="flex items-center gap-6 font-label-caps uppercase font-bold">
          <Link to="/" className="text-on-surface hover:text-primary transition-colors duration-75 linear">
            Home
          </Link>
          <a
            href="https://github.com/adityasrc/verdict"
            target="_blank"
            rel="noopener noreferrer"
            className="text-on-surface hover:text-primary transition-colors duration-75 linear"
          >
            GitHub
          </a>
          <Link to="/login" className="text-on-surface hover:text-primary transition-colors duration-75 linear">
            Sign In
          </Link>
        </nav>
      </div>
    </footer>
  );
};