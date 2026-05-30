import { ArrowRight, Check, Lock, Mail, User as UserIcon } from "lucide-react";
import { BookOpen } from "lucide-react";
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
  const [role, setRole] = useState<"STUDENT" | "TEACHER" | "ADMIN">("TEACHER");
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
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-8 group">
          <div className="bg-violet-600 p-1.5 rounded-lg transition-transform group-hover:scale-105">
            <BookOpen className="h-5 w-5 text-white" strokeWidth={2} />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">Verdict</span>
        </Link>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl shadow-black/40">
          <div className="text-center mb-7">
            <h1 className="text-xl font-semibold text-white tracking-tight">
              Create an account
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Enter your details to get started
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium text-zinc-400">
                Full Name
              </Label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-4 w-4 text-zinc-600 group-focus-within:text-violet-400 transition-colors" />
                </div>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="pl-9 h-10 rounded-lg bg-zinc-950 border-zinc-800 text-white text-sm placeholder:text-zinc-600 focus:border-violet-500/60 focus:ring-violet-500/20"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-zinc-400">
                Email
              </Label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-zinc-600 group-focus-within:text-violet-400 transition-colors" />
                </div>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="pl-9 h-10 rounded-lg bg-zinc-950 border-zinc-800 text-white text-sm placeholder:text-zinc-600 focus:border-violet-500/60 focus:ring-violet-500/20"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-zinc-400">
                Password
              </Label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-zinc-600 group-focus-within:text-violet-400 transition-colors" />
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="pl-9 h-10 rounded-lg bg-zinc-950 border-zinc-800 text-white text-sm placeholder:text-zinc-600 focus:border-violet-500/60 focus:ring-violet-500/20"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-xs font-medium text-zinc-400">
                Role
              </Label>
              <select
                id="role"
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as "STUDENT" | "TEACHER" | "ADMIN")
                }
                className="block w-full h-10 px-3 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all"
              >
                <option value="STUDENT" className="bg-zinc-900">Student</option>
                <option value="TEACHER" className="bg-zinc-900">Teacher</option>
                <option value="ADMIN" className="bg-zinc-900">Admin</option>
              </select>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all mt-2"
            >
              {isLoading ? "Creating account..." : (
                <span className="flex items-center justify-center gap-2">
                  Sign Up
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-zinc-800/60">
            <div className="flex flex-col gap-2">
              {["Rubric-based AI grading", "Real-time grading updates", "Export results instantly"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <div className="flex-shrink-0 w-4 h-4 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-violet-400" />
                  </div>
                  <span className="text-xs text-zinc-500">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-sm text-zinc-500 mt-5">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-violet-400 hover:text-violet-300 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;