import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight, ShieldStar } from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { PasswordInput } from "../components/ui/password-input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import bgImage from "../assets/my-synergy.jpg";

export default function RegisterPage() {
  const { user, register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student", official_id: "" });
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSubmitting(true);
    const res = await register(form);
    setSubmitting(false);
    if (res.ok) toast.success("Account created!");
    else toast.error(res.error || "Registration failed");
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
          <div className="label-caps text-emerald-400/80">Create account</div>
          <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight mt-2 text-white">Get started</h2>
          <p className="text-slate-400 text-sm mt-1">Register as a student or staff member.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-3.5" data-testid="register-form">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-slate-300 text-xs font-medium uppercase tracking-wider">Name</Label>
              <Input id="name" required value={form.name} onChange={update("name")}
                data-testid="register-name-input"
                className="bg-slate-950/50 border-slate-800 h-10 text-sm" placeholder="Enter your full name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-300 text-xs font-medium uppercase tracking-wider">Email</Label>
              <Input id="email" type="email" required value={form.email} onChange={update("email")}
                data-testid="register-email-input"
                className="bg-slate-950/50 border-slate-800 h-10 text-sm" placeholder="Enter your email address" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-300 text-xs font-medium uppercase tracking-wider">Password</Label>
              <PasswordInput id="password" required minLength={6} value={form.password}
                onChange={update("password")}
                data-testid="register-password-input"
                className="bg-slate-950/50 border-slate-800 h-10 text-sm" placeholder="At least 6 characters" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger className="bg-slate-950/50 border-slate-800 h-10 text-sm" data-testid="register-role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.role === "staff" && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label htmlFor="official_id" className="text-slate-300 text-xs font-medium uppercase tracking-wider">Official Staff ID</Label>
                <Input
                  id="official_id"
                  required
                  value={form.official_id}
                  onChange={update("official_id")}
                  data-testid="register-official-id-input"
                  className="bg-slate-950/50 border-slate-800 h-10 text-sm uppercase"
                  placeholder="e.g. STAFF001"
                />
              </div>
            )}

            <Button type="submit" disabled={submitting}
              data-testid="register-submit-btn"
              className="w-full h-10 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold mt-2 transition-all">
              {submitting ? "Creating account…" : (<>Create account <ArrowRight size={18} className="ml-1.5" /></>)}
            </Button>
          </form>

          <div className="mt-6 text-sm text-slate-400 text-center border-t border-white/5 pt-4">
            Already have an account?{" "}
            <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors" data-testid="goto-login">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
