import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  Mail,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useAppDispatch } from "../app/store";
import { useSignupMutation } from "../features/auth/authApi";
import { setCredentials } from "../features/auth/authSlice";
import { BrandMark } from "../components/BrandMark";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { parseApiError } from "../lib/errors";

const ROLES = [
  {
    value: "TEACHER" as const,
    title: "Teacher",
    description: "Create assignments and review evaluations.",
    icon: GraduationCap,
  },
  {
    value: "STUDENT" as const,
    title: "Student",
    description: "Submit coursework and view feedback.",
    icon: UsersRound,
  },
];

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [showPassword, setShowPassword] = useState(false);
  const [signup, { isLoading }] = useSignupMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.SyntheticEvent) => {
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
      toast.error(parseApiError(err, "Signup failed. Please try again."));
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px]">
        <BrandMark className="mb-8" />

        <div className="mb-6">
          <h1 className="text-heading-md text-text-primary font-semibold tracking-tight">
            Create your account
          </h1>
          <p className="text-body-sm text-text-secondary mt-1">
            Choose your role and fill in your details.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface card-glow p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Role selection */}
            <div className="space-y-1.5">
              <Label>Role</Label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((option) => {
                  const Icon = option.icon;
                  const selected = role === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRole(option.value)}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        selected
                          ? "border-border-strong bg-surface-raised text-text-primary"
                          : "border-border bg-canvas text-text-secondary hover:border-border-strong hover:bg-surface-raised"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 mb-2 ${
                          selected ? "text-text-primary" : "text-text-muted"
                        }`}
                      />
                      <span className="block text-body-sm font-semibold text-text-primary">
                        {option.title}
                      </span>
                      <span className="block text-xs text-text-muted mt-0.5 leading-snug">
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  required
                  className="h-10 pl-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="h-10 pl-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-10 pl-10 pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 rounded flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="default"
              disabled={isLoading}
              className="w-full h-10 mt-1"
            >
              {isLoading ? "Creating account…" : "Create Account"}
            </Button>
          </form>
        </div>

        <p className="text-center text-body-sm text-text-secondary mt-5">
          Already have an account?{" "}
          <Link to="/login" className="text-text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
