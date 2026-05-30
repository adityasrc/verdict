import { ArrowRight, Lock, Mail } from "lucide-react";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { useAppDispatch } from "../app/store";
import { useLoginMutation } from "../features/auth/authApi";
import { setCredentials } from "../features/auth/authSlice";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await login({ email, password }).unwrap();
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
      toast.error(
        apiError?.data?.message || "Login failed. Please check your credentials."
      );
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
              Welcome back
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Sign in to your workspace
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="••••••••"
                  className="pl-9 h-10 rounded-lg bg-zinc-950 border-zinc-800 text-white text-sm placeholder:text-zinc-600 focus:border-violet-500/60 focus:ring-violet-500/20"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all mt-2"
            >
              {isLoading ? (
                <span className="animate-pulse">Signing in...</span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-zinc-500 mt-6">
            Don&apos;t have an account?{" "}
            <Link
              to="/signup"
              className="font-semibold text-violet-400 hover:text-violet-300 transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;