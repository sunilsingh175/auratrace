"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Lock, ArrowRight, ArrowLeft, User, Shield, UserPlus, LogIn, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login, register, verifyOtp, resendOtp } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [role, setRole] = useState<"Developer" | "Admin">("Developer");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);
  const [otp, setOtp] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const switchTab = (tab: "login" | "register") => {
    setActiveTab(tab);
    setOtpRequired(false);
    setOtp("");
    resetMessages();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetMessages();

    if (otpRequired) {
      const result = await verifyOtp({
        email,
        otp,
        purpose: activeTab === "register" ? "register" : "login",
      });
      if (result.success) {
        setSuccessMessage("Verification successful! Redirecting to dashboard...");
        setTimeout(() => router.push(result.role === "Admin" ? "/admin/dashboard" : "/dashboard"), 400);
      } else {
        setErrorMessage(result.error || "Invalid or expired OTP code.");
        setLoading(false);
      }
      return;
    }

    const result = activeTab === "register"
      ? await register({
          name,
          email,
          password,
          role,
          adminRegistrationKey: role === "Admin" ? adminKey : undefined,
        })
      : await login({ email, password });

    if (result.success && result.otpRequired) {
      setOtpRequired(true);
      setOtp("");
      setSuccessMessage("A 6-digit verification code has been sent to your email. Please check your inbox.");
      setLoading(false);
    } else if (result.success) {
      setSuccessMessage("Authentication successful. Redirecting...");
      setTimeout(() => router.push(result.role === "Admin" ? "/admin/dashboard" : "/dashboard"), 400);
    } else {
      setErrorMessage(typeof result.error === "string" ? result.error : "Authentication failed.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    resetMessages();
    const result = await resendOtp({
      email,
      purpose: activeTab === "register" ? "register" : "login",
    });
    if (result.success) {
      setSuccessMessage("A fresh verification code has been sent to your email.");
    } else {
      setErrorMessage(result.error || "Failed to resend code.");
    }
    setResending(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-[#080c14] relative overflow-hidden">
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-600/15 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-indigo-600/15 blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md my-8">
        <div className="panel border-slate-800/90 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-2xl">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-1">
              <div className="flex h-full w-full items-center justify-center rounded-[12px] bg-slate-950">
                <Sparkles className="h-7 w-7 text-cyan-300" />
              </div>
            </div>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-white">AuraTrace Console</h1>
            <p className="mt-1 text-xs text-slate-400">Autonomous AI Observability & Crash Diagnostics</p>
          </div>

          <div className="mt-6 flex rounded-xl border border-slate-800 bg-slate-950 p-1">
            <button type="button" onClick={() => switchTab("login")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold ${activeTab === "login" ? "bg-slate-800 text-white" : "text-slate-400"}`}>
              <LogIn className="h-3.5 w-3.5" /> Sign In
            </button>
            <button type="button" onClick={() => switchTab("register")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold ${activeTab === "register" ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white" : "text-slate-400"}`}>
              <UserPlus className="h-3.5 w-3.5" /> Register
            </button>
          </div>

          {!otpRequired && (
            <div className="mt-4">
              <span className="label block mb-1.5 text-center text-slate-500">
                {activeTab === "register" ? "Select Account Role" : "Sign In Role"}
              </span>
              <div className="flex rounded-xl border border-slate-800/80 bg-slate-950/70 p-1">
                <button type="button" onClick={() => setRole("Developer")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold ${role === "Developer" ? "bg-blue-600 text-white" : "text-slate-400"}`}>
                  <User className="h-3.5 w-3.5" /> Developer
                </button>
                <button type="button" onClick={() => setRole("Admin")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold ${role === "Admin" ? "bg-indigo-600 text-white" : "text-slate-400"}`}>
                  <Shield className="h-3.5 w-3.5" /> Admin
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
            {otpRequired ? (
              <>
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                  <p className="text-xs font-semibold text-cyan-300">Email verification required</p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-400">
                    Enter the 6-digit code sent to <span className="text-slate-200">{email}</span>. The code expires in 5 minutes.
                  </p>
                </div>
                <div>
                  <label className="label">One-Time Verification Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Enter 6-digit OTP code"
                    className="field mt-1 text-center text-lg tracking-[0.4em] font-mono"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <button
                    type="button"
                    onClick={() => { setOtpRequired(false); setOtp(""); resetMessages(); }}
                    className="text-slate-400 hover:text-slate-200 transition"
                  >
                    ← Edit email & password
                  </button>

                  <button
                    type="button"
                    disabled={resending}
                    onClick={handleResend}
                    className="font-semibold text-cyan-400 hover:text-cyan-300 disabled:opacity-50 transition"
                  >
                    {resending ? "Sending code..." : "Resend code"}
                  </button>
                </div>
              </>
            ) : (
              <>
                {activeTab === "register" && (
                  <div>
                    <label className="label">Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name (e.g. Sunil Rajput)"
                      className="field mt-1"
                    />
                  </div>
                )}
                <div>
                  <label className="label">Work Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your work email address (e.g. sunil@company.com)"
                    className="field mt-1"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="label">Password</label>
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-[10px] text-slate-500 flex items-center gap-1">
                      {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />} {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password (min. 8 characters)"
                    className="field mt-1 font-mono"
                  />
                </div>
                {activeTab === "register" && role === "Admin" && (
                  <div>
                    <label className="label">Admin Registration Key</label>
                    <input
                      type="password"
                      required
                      value={adminKey}
                      onChange={(e) => setAdminKey(e.target.value)}
                      placeholder="Enter admin registration security key"
                      className="field mt-1 font-mono"
                    />
                  </div>
                )}
              </>
            )}

            {errorMessage && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">{errorMessage}</div>}
            {successMessage && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> <span>{successMessage}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-white shadow-lg ${role === "Admin" ? "bg-gradient-to-r from-indigo-600 to-purple-600" : "bg-gradient-to-r from-blue-600 to-indigo-600"}`}>
              {loading ? "Processing..." : otpRequired ? "Verify Code" : activeTab === "register" ? `Create ${role} Account` : `Sign In as ${role}`}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-6 flex flex-col items-center gap-3 border-t border-slate-800/80 pt-4 text-center">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to Live Dashboard</span>
            </Link>
            <p className="text-[10px] text-slate-500">
              Admin registration additionally requires the configured server-side registration key.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
