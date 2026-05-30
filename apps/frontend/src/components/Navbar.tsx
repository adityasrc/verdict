import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  LayoutDashboard,
  LogOut,
  User,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        isScrolled
          ? "bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
        <Link to={logoHref} className="flex items-center gap-2.5 group">
          <div className="bg-violet-600 p-1.5 rounded-lg transition-transform group-hover:scale-105">
            <BookOpen className="h-5 w-5 text-white" strokeWidth={2} />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">
            Verdict
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 pl-3 border-l border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                className="text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 h-9"
                asChild
              >
                <Link to="/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>

              <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
                <User size={14} className="text-violet-400" />
                <span className="truncate max-w-[140px]">{user.email}</span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-sm font-medium text-zinc-500 hover:text-red-400 hover:bg-red-950/30 h-9"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log Out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 pl-3 border-l border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                className="text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 h-9"
                asChild
              >
                <Link to="/login">Log In</Link>
              </Button>
              <Button
                size="sm"
                className="bg-white hover:bg-zinc-200 text-zinc-950 text-sm font-medium h-9 px-5"
                asChild
              >
                <Link to="/signup">Get Started</Link>
              </Button>
            </div>
          )}
        </div>

        <div className="flex md:hidden items-center gap-2">
          <button
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5 text-white" />
            ) : (
              <Menu className="h-5 w-5 text-white" />
            )}
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        ref={menuRef}
        className={`md:hidden fixed inset-0 top-16 z-40 bg-zinc-950/98 backdrop-blur-xl transition-all duration-200 ${
          isMobileMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!isMobileMenuOpen}
      >
        <nav
          className={`flex flex-col p-6 gap-4 transition-transform duration-200 ${
            isMobileMenuOpen ? "translate-y-0" : "-translate-y-2"
          }`}
        >
          {user ? (
            <>
              <div className="flex items-center gap-3 text-sm text-zinc-400 bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                <User size={18} className="text-violet-400 shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
              <Button
                className="w-full py-5 text-base rounded-xl bg-white text-zinc-950"
                asChild
              >
                <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                  Dashboard
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full py-5 text-base rounded-xl border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                onClick={handleLogout}
              >
                Log Out
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                className="w-full py-5 text-base rounded-xl border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                asChild
              >
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  Log In
                </Link>
              </Button>
              <Button
                className="w-full py-5 text-base bg-white text-zinc-950 rounded-xl"
                asChild
              >
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