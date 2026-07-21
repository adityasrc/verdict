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
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen bg-surface flex flex-col md:flex-row font-sans selection:bg-primary selection:text-on-primary">


      <div className="w-full md:w-[40%] lg:w-[35%] bg-primary border-b-[4px] md:border-b-0 md:border-r-[4px] border-on-surface p-8 md:p-12 flex flex-col relative md:min-h-screen">
        <Link to="/" className="flex items-center gap-3 w-fit">
          <div className="bg-surface border-[4px] border-on-surface brutal-shadow flex items-center justify-center p-1.5 brutal-button">
            <span className="material-symbols-outlined text-on-surface text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
              menu_book
            </span>
          </div>
          <span className="font-headline-md text-xl font-black uppercase tracking-tighter text-on-primary">
            Verdict
          </span>
        </Link>

        <div className="flex-1 flex flex-col justify-center mt-12 mb-4 md:mt-0 md:mb-0 md:pb-32">
          <h1 className="text-5xl md:text-6xl lg:text-[80px] font-black uppercase tracking-tighter text-on-primary leading-none mb-6">
            Welcome<br />back.
          </h1>
          <p className="text-on-primary text-lg font-medium max-w-[280px] hidden md:block opacity-90 leading-relaxed">
            Access your Verdict workspace and continue managing your grading pipelines.
          </p>
        </div>

        <div className="hidden md:block absolute bottom-12 left-12 pr-12">
          <p className="font-label-mono text-[11px] font-bold uppercase tracking-widest text-on-primary opacity-60">
            AI-powered grading platform.
          </p>
        </div>
      </div>


      <div className="flex-1 flex items-center justify-center p-6 md:p-12 overflow-y-auto">
        <div className="w-full max-w-[420px] mt-8 md:mt-12">

          <div className="mb-10">
            <h2 className="font-headline-md text-3xl font-black uppercase tracking-tighter text-on-surface mb-2">
              Sign In
            </h2>
            <p className="text-on-surface-variant text-base font-bold uppercase">
              Access your grading workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col">
            <Label htmlFor="email" className="mb-2">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="h-14 font-label-mono mb-6"
            />

            <Label htmlFor="password" className="mb-2">Password</Label>
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

            <Button
              type="submit"
              variant="brutal"
              size="lg"
              disabled={isLoading}
              className={`w-full mt-8 h-16 text-lg flex items-center justify-center ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? "Processing..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-10 pt-8 border-t-[4px] border-on-surface flex flex-col items-center">
            <p className="font-body-md font-bold text-on-surface uppercase text-sm">
              Don't have an account?
              <Link to="/signup" className="text-primary hover:text-primary-container font-black ml-2 transition-colors">
                CREATE ACCOUNT
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;