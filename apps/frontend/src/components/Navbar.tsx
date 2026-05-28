import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  BookOpen, 
  LayoutDashboard, 
  LogOut, 
  Moon, 
  Sun, 
  User, 
  Menu, 
  X 
} from "lucide-react";
import { Button } from "@/components/ui/button"; // Shadcn Button
import { useAppDispatch, useAppSelector } from "../app/store";
import { useTheme } from "../context/ThemeContext";
import { logout, selectCurrentUser } from "../features/auth/authSlice";

const Navbar: React.FC = () => {
  const user = useAppSelector(selectCurrentUser);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  // Your Flowboard patterns
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    setIsMobileMenuOpen(false);
    navigate("/login");
  };

  // Dynamic class for frosted glass effect
  const navBackgroundClass = isScrolled 
    ? "bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200/60 dark:border-zinc-800/60 shadow-sm py-2" 
    : "bg-transparent border-b border-transparent py-4";

  return (
    <header className={`fixed top-0 z-50 w-full transition-all duration-300 ${navBackgroundClass}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6">
        
        {/* Logo */}
        <div className="flex items-center">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="bg-violet-600 dark:bg-violet-500 p-1.5 rounded-xl transition-transform group-hover:rotate-6">
              <BookOpen className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-[20px] tracking-tight text-zinc-900 dark:text-zinc-50">
              Verdict
            </span>
          </Link>
        </div>

        {/* Desktop Navigation & Auth */}
        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-zinc-400 transition-colors"
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user ? (
            <div className="flex items-center gap-4 pl-4 border-l border-zinc-200 dark:border-zinc-800">
              <Button variant="ghost" size="sm" className="text-[13px] font-medium text-zinc-600 dark:text-zinc-300" asChild>
                <Link to="/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              
              <div className="flex items-center gap-2 text-[13px] font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 px-3 py-1.5 rounded-full">
                <User size={14} className="text-violet-600 dark:text-violet-400" />
                {user.email}
              </div>

              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleLogout}
                className="text-[13px] font-medium rounded-full shadow-sm hover:shadow-md transition-all"
              >
                <LogOut className="mr-2 h-4 w-4" /> Exit
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 pl-4 border-l border-zinc-200 dark:border-zinc-800">
              <Button variant="ghost" size="sm" className="text-[13px] font-medium text-zinc-600 dark:text-zinc-300" asChild>
                <Link to="/login">Log In</Link>
              </Button>
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white text-[13px] font-medium rounded-full px-5 shadow-md hover:shadow-violet-500/25 transition-all" asChild>
                <Link to="/signup">Get Started</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex md:hidden items-center gap-3">
          <button onClick={toggleTheme} className="p-2 text-zinc-500 dark:text-zinc-400">
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button 
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6 text-zinc-900 dark:text-zinc-100" /> : <Menu className="h-6 w-6 text-zinc-900 dark:text-zinc-100" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[72px] z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <nav className="flex flex-col p-8 gap-6">
            {user ? (
              <>
                <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 p-4 rounded-xl">
                  <User size={18} className="text-violet-600 dark:text-violet-400" />
                  <span className="truncate">{user.email}</span>
                </div>
                <Button className="w-full py-6 text-lg rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900" asChild>
                  <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>Go to Dashboard</Link>
                </Button>
                <Button variant="destructive" className="w-full py-6 text-lg rounded-xl" onClick={handleLogout}>
                  Exit / Logout
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="w-full py-6 text-lg rounded-xl dark:border-zinc-800" asChild>
                  <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>Log In</Link>
                </Button>
                <Button className="w-full py-6 text-lg bg-violet-600 hover:bg-violet-700 text-white rounded-xl" asChild>
                  <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)}>Get Started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;