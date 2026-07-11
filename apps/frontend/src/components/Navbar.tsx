import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/store";
import { logout, selectCurrentUser } from "../features/auth/authSlice";
import { Button } from "../components/ui/button";

const Navbar = () => {
  const user = useAppSelector(selectCurrentUser);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const handleLogout = () => {
    dispatch(logout());
    setIsMobileMenuOpen(false);
    navigate("/login");
  };

  const logoHref = "/";

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-75 linear ${isScrolled
          ? "bg-surface border-b-[4px] border-on-surface brutal-shadow"
          : "bg-surface border-b-[4px] border-surface"
        }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
        <Link to={logoHref} className="flex items-center gap-3 group">
          <div className="bg-primary border-[4px] border-on-surface brutal-shadow flex items-center justify-center p-1.5 brutal-button">
            <span className="material-symbols-outlined text-on-primary" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
          </div>
          <span className="font-headline-md text-xl font-black uppercase tracking-tighter text-on-surface">
            Verdict
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4 pl-4 border-l-[4px] border-on-surface h-10">
              <Link to="/dashboard" className="font-label-caps text-sm uppercase text-on-surface hover:text-primary font-bold transition-colors duration-75 linear">
                Dashboard
              </Link>
              <div className="flex items-center gap-2 px-3 py-1 bg-secondary border-[4px] border-on-surface brutal-shadow">
                <span className="material-symbols-outlined text-sm text-on-secondary">person</span>
                <span className="font-label-mono text-xs uppercase font-bold truncate max-w-[140px] text-on-secondary">{user.email?.split('@')[0]}</span>
              </div>
              <Button
                onClick={handleLogout}
                variant="brutal-error"
                size="sm"
                className="px-4"
              >
                Log Out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4 pl-4 border-l-[4px] border-on-surface h-10">
              <Button asChild variant="brutal-ghost" size="sm">
                <Link to="/login">Log In</Link>
              </Button>
              <Button asChild variant="brutal" size="sm">
                <Link to="/signup">Get Started</Link>
              </Button>
            </div>
          )}
        </div>

        <div className="flex md:hidden items-center gap-2">
          <button
            className="p-2 border-[4px] border-on-surface brutal-shadow bg-surface hover:bg-primary hover:text-on-primary transition-colors duration-75 linear brutal-button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          >
            <span className="material-symbols-outlined">
              {isMobileMenuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>


      <div
        id="mobile-menu"
        ref={menuRef}
        className={`md:hidden fixed inset-0 top-16 z-40 bg-surface border-b-[4px] border-on-surface brutal-shadow transition-all duration-75 linear ${isMobileMenuOpen
            ? "opacity-100 pointer-events-auto translate-y-0"
            : "opacity-0 pointer-events-none -translate-y-4"
          }`}
      >
        <nav className="flex flex-col p-6 gap-6">
          {user ? (
            <>
              <div className="flex items-center gap-3 bg-secondary border-[4px] border-on-surface p-4 brutal-shadow text-on-secondary">
                <span className="material-symbols-outlined">person</span>
                <span className="font-label-mono uppercase font-bold truncate">{user.email}</span>
              </div>
              <Button asChild variant="brutal" className="w-full py-6 text-lg">
                <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                  Dashboard
                </Link>
              </Button>
              <Button onClick={handleLogout} variant="brutal-error" className="w-full py-6 text-lg">
                Log Out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="brutal-ghost" className="w-full py-6 text-lg bg-surface-variant">
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  Log In
                </Link>
              </Button>
              <Button asChild variant="brutal" className="w-full py-6 text-lg">
                <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                  Get Started
                </Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;