import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/store";
import { logout, selectCurrentUser } from "../features/auth/authSlice";

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
      className={`fixed top-0 z-50 w-full transition-all duration-75 ${
        isScrolled
          ? "bg-surface border-b-[4px] border-on-surface brutal-shadow"
          : "bg-surface border-b-[4px] border-surface"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-20">
        <Link to={logoHref} className="flex items-center gap-3 group">
          <div className="bg-primary border-[2px] border-on-surface brutal-shadow flex items-center justify-center p-2 brutal-button">
            <span className="material-symbols-outlined text-on-primary" style={{fontVariationSettings: "'FILL' 1"}}>menu_book</span>
          </div>
          <span className="font-headline-md text-headline-md font-black uppercase tracking-tighter text-on-surface">
            Verdict
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4 pl-4 border-l-[4px] border-on-surface h-10">
              <Link to="/dashboard" className="font-label-caps text-label-caps uppercase text-on-surface hover:text-primary font-bold transition-colors">
                Dashboard
              </Link>
              <div className="flex items-center gap-2 px-3 py-1 bg-secondary-fixed border-[2px] border-on-surface brutal-shadow">
                <span className="material-symbols-outlined text-sm">person</span>
                <span className="font-label-mono text-xs uppercase font-bold truncate max-w-[140px]">{user.email?.split('@')[0]}</span>
              </div>
              <button
                onClick={handleLogout}
                className="font-label-caps text-label-caps uppercase text-error hover:text-on-error hover:bg-error border-[2px] border-transparent hover:border-on-surface px-3 py-1 transition-colors font-bold"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4 pl-4 border-l-[4px] border-on-surface h-10">
              <Link to="/login" className="font-label-caps text-label-caps uppercase text-on-surface hover:text-primary font-bold transition-colors">
                Log In
              </Link>
              <Link to="/signup" className="bg-primary text-on-primary px-6 py-2 border-[4px] border-on-surface brutal-shadow brutal-button font-label-caps text-label-caps uppercase font-bold">
                Get Started
              </Link>
            </div>
          )}
        </div>

        <div className="flex md:hidden items-center gap-2">
          <button
            className="p-2 border-[2px] border-on-surface brutal-shadow bg-surface hover:bg-primary hover:text-on-primary transition-colors brutal-button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          >
            <span className="material-symbols-outlined">
              {isMobileMenuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        id="mobile-menu"
        ref={menuRef}
        className={`md:hidden fixed inset-0 top-20 z-40 bg-surface border-b-[4px] border-on-surface brutal-shadow transition-all duration-200 ${
          isMobileMenuOpen
            ? "opacity-100 pointer-events-auto translate-y-0"
            : "opacity-0 pointer-events-none -translate-y-4"
        }`}
      >
        <nav className="flex flex-col p-6 gap-6">
          {user ? (
            <>
              <div className="flex items-center gap-3 bg-secondary-fixed border-[4px] border-on-surface p-4 brutal-shadow">
                <span className="material-symbols-outlined">person</span>
                <span className="font-label-mono uppercase font-bold truncate">{user.email}</span>
              </div>
              <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-center py-4 bg-primary text-on-primary border-[4px] border-on-surface font-label-caps uppercase font-bold brutal-shadow brutal-button">
                Dashboard
              </Link>
              <button onClick={handleLogout} className="w-full py-4 bg-error text-on-error border-[4px] border-on-surface font-label-caps uppercase font-bold brutal-shadow brutal-button">
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-center py-4 bg-surface-variant text-on-surface border-[4px] border-on-surface font-label-caps uppercase font-bold brutal-shadow brutal-button hover:bg-surface">
                Log In
              </Link>
              <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-center py-4 bg-primary text-on-primary border-[4px] border-on-surface font-label-caps uppercase font-bold brutal-shadow brutal-button">
                Get Started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;