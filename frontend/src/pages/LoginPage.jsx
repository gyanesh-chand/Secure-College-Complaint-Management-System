import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ShieldStar, ArrowRight } from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { PasswordInput } from "../components/ui/password-input";
import { Label } from "../components/ui/label";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import bgImage from "../assets/my-synergy.jpg";

export default function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={location.state?.from?.pathname || "/dashboard"} replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await login(email, password);
    setSubmitting(false);
    if (res.ok) toast.success("Welcome back!");
    else toast.error(res.error || "Login failed");
  };

  return (
    <div
      className="min-h-screen relative"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="absolute inset-0 bg-black/60" />

      {/* Top-left logo */}
      <div className="absolute top-6 left-6 z-20 flex items-center gap-2">
        <img
          src="/logo.jpg"
          alt="Synergy Logo"
          className="w-10 sm:w-12 md:w-14 object-contain opacity-80"
          style={{ backgroundColor: "transparent", mixBlendMode: "screen" }}
        />
        <span className="text-white text-lg sm:text-xl font-semibold">CampusDesk</span>
      </div>

      <div className="relative z-20 flex items-center justify-center p-6 min-h-screen">
        <div className="w-[90%] max-w-[450px] bg-[#0f172a]/72 backdrop-blur-[12px] rounded-xl p-7 border border-white/10 shadow-2xl">
          <div className="label-caps text-emerald-400/80">Sign in</div>
          <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight mt-2 text-white">Welcome back</h2>
          <p className="text-slate-400 text-sm mt-1">Use your college credentials to access the dashboard.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4" data-testid="login-form">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-300 text-xs font-medium uppercase tracking-wider">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                data-testid="login-email-input"
                className="bg-slate-950/50 border-slate-800 focus-visible:ring-emerald-500/40 h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-300 text-xs font-medium uppercase tracking-wider">Password</Label>
              <PasswordInput
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                data-testid="login-password-input"
                className="bg-slate-950/50 border-slate-800 focus-visible:ring-emerald-500/40 h-10 text-sm"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              data-testid="login-submit-btn"
              className="w-full h-10 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold mt-2 transition-all"
            >
              {submitting ? "Signing in…" : (<>Sign in <ArrowRight size={18} className="ml-1.5" /></>)}
            </Button>
          </form>

          <div className="mt-6 text-sm text-slate-400 text-center border-t border-white/5 pt-4">
            New to CampusDesk?{" "}
            <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors" data-testid="goto-register">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
