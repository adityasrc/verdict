import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { BrandMark } from "./BrandMark";
import { Button } from "../components/ui/button";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileMenuOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Close menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const closeMenu = () => setIsMobileMenuOpen(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isDashboardActive = location.pathname.startsWith("/dashboard");
  const activeLinkClass = `text-sm transition-colors ${isDashboardActive
    ? "text-text-primary font-medium"
    : "text-text-secondary hover:text-text-primary"
    }`;
  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const roleLabel = user?.role === "TEACHER" ? "educator" : "student";

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-200 ${isScrolled || isMobileMenuOpen
        ? "bg-surface/90 backdrop-blur-md border-b border-border shadow-sm"
        : "bg-surface/80 backdrop-blur-sm border-b border-border/40"
        }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-14">
        <BrandMark to="/" />

        <nav className="hidden md:flex items-center gap-5">
          {user ? (
            <>
              <Link to="/dashboard" className={activeLinkClass}>
                Dashboard
              </Link>

              <span className="text-text-primary text-sm select-none">
                {displayName}
              </span>

              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Log In
              </Link>
              <Button asChild variant="default" size="sm">
                <Link to="/signup">Get Started</Link>
              </Button>
            </div>
          )}
        </nav>

        <div className="flex md:hidden items-center">
          <button
            type="button"
            className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {isMobileMenuOpen &&
        createPortal(
          <div
            id="mobile-menu"
            className="md:hidden fixed inset-x-0 top-14 bottom-0 z-50 bg-surface border-t border-border overflow-y-auto"
          >
            <nav className="flex flex-col p-6 gap-3">
              {user ? (
                <>
                  <div className="pb-4 border-b border-border">
                    <p className="text-sm font-medium text-text-primary">
                      {displayName}
                    </p>
                    <p className="font-mono text-xs text-text-muted mt-0.5">
                      {user.email}
                    </p>
                    <p className="font-mono text-xs text-text-muted mt-1 capitalize">
                      {roleLabel}
                    </p>
                  </div>

                  <Link to="/dashboard" onClick={closeMenu} className={`py-2 ${activeLinkClass}`}>
                    Dashboard
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors py-2 text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log out</span>
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-4 pt-1">
                  <div className="flex flex-col gap-4 pb-4 border-b border-border">
                    <Link
                      to="/#pipeline"
                      onClick={closeMenu}
                      className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                      Grading Pipeline
                    </Link>
                    <Link
                      to="/#workflow"
                      onClick={closeMenu}
                      className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                      Evaluation Workflow
                    </Link>
                    <Link
                      to="/#stack"
                      onClick={closeMenu}
                      className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                      Tech Stack
                    </Link>
                  </div>
                  <Link
                    to="/login"
                    onClick={closeMenu}
                    className="text-sm text-text-secondary hover:text-text-primary py-2 transition-colors"
                  >
                    Log In
                  </Link>
                  <Button asChild variant="default" className="w-full" onClick={closeMenu}>
                    <Link to="/signup">Get Started</Link>
                  </Button>
                </div>
              )}
            </nav>
          </div>,
          document.body,
        )}
    </header>
  );
};

export default Navbar;