import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch } from "../app/store";
import { useSignupMutation } from "../features/auth/authApi";
import { setCredentials } from "../features/auth/authSlice";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";

const Signup: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("TEACHER");
  const [showPassword, setShowPassword] = useState(false);
  const [signup, { isLoading }] = useSignupMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await signup({ email, password, name, role }).unwrap();
      dispatch(
        setCredentials({
          user: response.data.user,
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
        })
      );
      navigate("/dashboard");
    } catch (err: unknown) {
      const apiError = err as { data?: { message?: string } };
      toast.error(apiError?.data?.message || "Signup failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col md:flex-row font-sans selection:bg-primary selection:text-on-primary">
      
      {/* ── Branding Pane ── */}
      <div className="w-full md:w-[40%] lg:w-[35%] bg-accent-yellow border-b-[2px] md:border-b-0 md:border-r-[2px] border-on-surface p-8 md:p-12 flex flex-col items-start pt-12 md:pt-24">
        <Link to="/" className="flex items-center gap-3 w-fit mb-16 md:mb-24">
          <div className="bg-primary border-[2px] border-on-surface brutal-shadow flex items-center justify-center p-1.5 brutal-button">
            <span className="material-symbols-outlined text-on-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
              menu_book
            </span>
          </div>
          <span className="font-headline-md text-xl font-black uppercase tracking-tighter text-on-surface">
            Verdict
          </span>
        </Link>

        <div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter text-on-surface leading-none mb-6">
            Start<br/>grading<br/>smarter.
          </h1>
          <p className="text-on-surface-variant text-lg md:text-xl font-medium max-w-sm hidden md:block">
            Create your free Verdict account and automate your first evaluation pipeline.
          </p>
        </div>
      </div>

      {/* ── Form Pane ── */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 overflow-y-auto">
        <div className="w-full max-w-[420px]">
          {/* Mobile support text */}
          <p className="text-on-surface-variant text-lg font-medium mb-8 md:hidden">
            Create your free Verdict account and automate your first evaluation pipeline.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Role Selection (Brutalist Radio) */}
            <div className="space-y-2">
              <Label>I am a...</Label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setRole("TEACHER")}
                  className={`flex-1 py-3 border-[4px] font-label-caps uppercase font-bold transition-all brutal-button ${
                    role === "TEACHER" 
                      ? "border-on-surface bg-on-surface text-surface brutal-shadow" 
                      : "border-surface-variant bg-transparent text-on-surface-variant hover:border-on-surface hover:text-on-surface"
                  }`}
                >
                  Teacher
                </button>
                <button
                  type="button"
                  onClick={() => setRole("STUDENT")}
                  className={`flex-1 py-3 border-[4px] font-label-caps uppercase font-bold transition-all brutal-button ${
                    role === "STUDENT" 
                      ? "border-on-surface bg-on-surface text-surface brutal-shadow" 
                      : "border-surface-variant bg-transparent text-on-surface-variant hover:border-on-surface hover:text-on-surface"
                  }`}
                >
                  Student
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                required
                className="h-14 font-label-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="h-14 font-label-mono"
              />
            </div>

            <div className="space-y-2 relative">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-14 pr-12 font-label-mono"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface hover:text-primary transition-colors flex items-center justify-center p-1"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="brutal"
              size="lg"
              disabled={isLoading}
              className={`w-full mt-8 h-16 text-lg ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                  Creating Account...
                </span>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="mt-10 pt-8 border-t-[2px] border-surface-variant flex flex-col items-center">
            <p className="font-body-md font-bold text-on-surface-variant uppercase text-sm">
              Already have an account?
            </p>
            <Link to="/login" className="mt-3 inline-flex items-center justify-center bg-transparent text-on-surface hover:bg-surface-variant px-6 py-3 font-label-caps text-sm uppercase font-bold transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;