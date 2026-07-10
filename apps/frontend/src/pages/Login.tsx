import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch } from "../app/store";
import { useLoginMutation } from "../features/auth/authApi";
import { setCredentials } from "../features/auth/authSlice";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { parseApiError } from "../lib/errors";
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
    } catch (err) {
      toast.error(parseApiError(err, "Login failed. Please check your credentials."));
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="bg-primary border-[2px] border-on-surface brutal-shadow flex items-center justify-center p-2 brutal-button transition-all duration-75">
            <span className="material-symbols-outlined text-on-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              menu_book
            </span>
          </div>
          <span className="font-headline-md text-headline-md font-black uppercase tracking-tighter text-on-surface">
            Verdict
          </span>
        </Link>

        {/* Card */}
        <div className="bg-surface border-[4px] border-on-surface p-8 brutal-shadow relative">
          {/* Corner Badge */}
          <div className="absolute -top-4 -left-4 bg-accent-yellow text-on-surface px-4 py-1 border-[4px] border-on-surface font-label-caps font-bold uppercase tracking-widest brutal-shadow z-10">
            Welcome Back
          </div>

          <div className="text-center mb-8 mt-4">
            <h1 className="font-headline-md text-2xl font-black uppercase text-on-surface tracking-tighter">
              Sign In
            </h1>
            <p className="font-body-md text-on-surface-variant mt-2 font-bold uppercase">
              Access your workspace
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button
              type="submit"
              variant="brutal"
              size="lg"
              disabled={isLoading}
              className="w-full mt-4"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          <p className="text-center font-body-md font-bold text-on-surface-variant mt-8">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline uppercase font-bold">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;