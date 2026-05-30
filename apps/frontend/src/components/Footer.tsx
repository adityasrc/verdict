import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface FooterProps {
  isAuthenticated?: boolean;
}

export const Footer = ({ isAuthenticated = false }: FooterProps) => {
  return (
    <footer className="bg-zinc-950">
      {!isAuthenticated && (
        <div className="border-t border-zinc-900 max-w-7xl mx-auto px-6 py-24 text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 text-white">
            Ready to save time?
          </h2>
          <p className="text-lg text-zinc-400 mb-12 max-w-md mx-auto leading-relaxed">
            Start grading with AI and focus on what matters most — teaching.
          </p>
          <Link
            to="/signup"
            className="group inline-flex items-center justify-center rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-zinc-950 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Get Started
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      )}

      <div className="border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-zinc-600">
            © {new Date().getFullYear()} Verdict. Built for educators.
          </p>
          <nav className="flex items-center gap-6">
            <Link
              to="/"
              className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Home
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              GitHub
            </a>
            <Link
              to="/login"
              className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
};