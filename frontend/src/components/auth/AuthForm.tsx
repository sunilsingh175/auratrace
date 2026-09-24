"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Fingerprint,
  KeyRound,
  Eye,
  EyeOff,
  Mail,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Lock,
  User,
  Shield,
  X,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";

interface AuthFormProps {
  initialTab?: "login" | "register";
}

export function AuthForm({ initialTab = "login" }: AuthFormProps) {
  const router = useRouter();
  const { login, register, verifyOtp, resendOtp, forgotPassword, resetPassword } = useAuth();

  const [activeTab, setActiveTab] = useState<"login" | "register">(initialTab);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);
  const [otp, setOtp] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<"email" | "reset" | "done">("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

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
    resetMessages();

    // Verification check for register
    if (activeTab === "register") {
      if (password.length < 8) {
        setErrorMessage("Password must be at least 8 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage("Passwords do not match. Please check and try again.");
        return;
      }
      if (!agreeTerms) {
        setErrorMessage("Please agree to the Terms of Service and Privacy Policy to register.");
        return;
      }
    }

    setLoading(true);

    // OTP Verification Flow (Only for registration confirmation)
    if (otpRequired) {
      const result = await verifyOtp({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        purpose: "register",
      });

      if (result.success) {
        setSuccessMessage("Account verification successful! Redirecting to platform...");
        setTimeout(() => {
          router.push(result.role === "Admin" ? "/admin" : "/dashboard");
        }, 500);
      } else {
        setErrorMessage(result.error || "Invalid or expired OTP code.");
        setLoading(false);
      }
      return;
    }

    // Direct Login or Register Flow
    const result =
      activeTab === "register"
        ? await register({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
            role: "Developer",
          })
        : await login({
            email: email.trim().toLowerCase(),
            password,
          });

    if (result.success && result.otpRequired) {
      setOtpRequired(true);
      setOtp("");
      setSuccessMessage("A 6-digit verification code has been sent to your email to activate your account.");
      setLoading(false);
    } else if (result.success) {
      setSuccessMessage("Authentication successful! Redirecting to Dashboard...");
      setTimeout(() => {
        router.push(result.role === "Admin" ? "/admin" : "/dashboard");
      }, 500);
    } else {
      setErrorMessage(typeof result.error === "string" ? result.error : "Invalid email or password.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    resetMessages();
    const result = await resendOtp({
      email: email.trim().toLowerCase(),
      purpose: "register",
    });
    if (result.success) {
      setSuccessMessage("A fresh verification code has been sent to your email.");
    } else {
      setErrorMessage(result.error || "Failed to resend code.");
    }
    setResending(false);
  };

  const handleForgotRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    if (!forgotEmail.trim()) {
      setForgotError("Please enter your registered email address.");
      return;
    }
    setForgotLoading(true);
    const result = await forgotPassword(forgotEmail.trim().toLowerCase());
    setForgotLoading(false);
    if (result.success) {
      setForgotStep("reset");
      setForgotSuccess("A 6-digit recovery verification code has been dispatched to your email.");
    } else {
      setForgotError(result.error || "Email not registered.");
    }
  };

  const handleForgotResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    if (!forgotOtp.trim() || forgotOtp.trim().length !== 6) {
      setForgotError("Please enter the 6-digit OTP sent to your email.");
      return;
    }
    if (newPassword.length < 8) {
      setForgotError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setForgotError("Passwords do not match.");
      return;
    }
    setForgotLoading(true);
    const result = await resetPassword({
      email: forgotEmail.trim().toLowerCase(),
      otp: forgotOtp.trim(),
      newPassword,
    });
    setForgotLoading(false);
    if (result.success) {
      setForgotStep("done");
      setSuccessMessage("Password reset successfully! You can now log in with your new password.");
      setEmail(forgotEmail.trim().toLowerCase());
      setActiveTab("login");
      setTimeout(() => {
        setShowForgotModal(false);
        setForgotStep("email");
        setForgotEmail("");
        setForgotOtp("");
        setNewPassword("");
        setConfirmNewPassword("");
      }, 1500);
    } else {
      setForgotError(result.error || "Failed to reset password. Please check your OTP code.");
    }
  };

  return (
    <div className="w-full max-w-[460px] mx-auto px-4 py-8">
      <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.06)] border border-slate-100">
        {/* Top Centered Icon Badge */}
        <div className="flex justify-center mb-5">
          <div className="w-13 h-13 p-3.5 rounded-2xl bg-red-50 border border-red-100/80 flex items-center justify-center text-[#c51f33] shadow-inner">
            {otpRequired ? (
              <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
            ) : activeTab === "login" ? (
              <Fingerprint className="w-6 h-6 stroke-[2.2]" />
            ) : (
              <KeyRound className="w-6 h-6 stroke-[2.2]" />
            )}
          </div>
        </div>

        {/* Header Titles */}
        <div className="text-center mb-7">
          <h1 className="text-2xl sm:text-[26px] font-extrabold text-slate-900 tracking-tight">
            {otpRequired
              ? "Verify your email"
              : activeTab === "login"
              ? "Welcome back"
              : "Create an account"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
            {otpRequired
              ? `Enter the 6-digit code sent to ${email}`
              : activeTab === "login"
              ? "Enter your email and password to sign in"
              : "Enter your details to register"}
          </p>
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50/80 p-3 text-xs text-red-700 flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-800 flex items-start gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-snug">{successMessage}</span>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {otpRequired ? (
            /* OTP Verification Screen */
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-[#f1f4f9] p-4 text-center">
                <span className="text-xs text-slate-600 block mb-1">
                  A verification code has been dispatched to
                </span>
                <span className="text-xs font-semibold text-slate-900 font-mono">
                  {email}
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  6-Digit OTP Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  required
                  autoFocus
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="000000"
                  className="w-full px-4 py-3.5 rounded-xl bg-[#f1f4f9] text-slate-900 text-xl font-mono text-center tracking-[0.5em] border border-transparent focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-500/20 transition outline-none"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setOtpRequired(false);
                    setOtp("");
                    resetMessages();
                  }}
                  className="text-slate-500 hover:text-slate-800 transition-colors"
                >
                  ← Edit details
                </button>

                <button
                  type="button"
                  disabled={resending}
                  onClick={handleResend}
                  className="font-semibold text-[#b91c1c] hover:underline disabled:opacity-50 transition"
                >
                  {resending ? "Sending code..." : "Resend code"}
                </button>
              </div>
            </div>
          ) : (
            /* Standard Login / Register Inputs */
            <>
              {activeTab === "register" && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-4 py-3 rounded-xl bg-[#f1f4f9] text-slate-900 text-sm placeholder:text-slate-400 border border-transparent focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-500/20 transition outline-none"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-4 py-3 rounded-xl bg-[#f1f4f9] text-slate-900 text-sm placeholder:text-slate-400 border border-transparent focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-500/20 transition outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  {activeTab === "register" && (
                    <span className="text-[11px] text-slate-400">
                      Min. 8 characters
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-11 rounded-xl bg-[#f1f4f9] text-slate-900 text-sm placeholder:text-slate-400 border border-transparent focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-500/20 transition outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {activeTab === "register" && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 pr-11 rounded-xl bg-[#f1f4f9] text-slate-900 text-sm placeholder:text-slate-400 border border-transparent focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-500/20 transition outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                      aria-label="Toggle confirm password visibility"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Email Verification Box on Register */}
              {activeTab === "register" && (
                <div className="rounded-xl border border-slate-200/80 bg-[#f0f4fd] p-3.5 flex items-start gap-3">
                  <div className="mt-0.5 shrink-0 text-[#b91c1c]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-tight">
                      Email Verification
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 leading-relaxed">
                      A verification code will be sent to your email to confirm
                      registration.
                    </p>
                  </div>
                </div>
              )}

              {/* Terms of Service Checkbox (Register) */}
              {activeTab === "register" && (
                <div className="flex items-start gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="agree-terms"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-[#b91c1c] focus:ring-red-500 accent-[#b91c1c] cursor-pointer"
                  />
                  <label
                    htmlFor="agree-terms"
                    className="text-xs text-slate-600 leading-normal cursor-pointer"
                  >
                    I agree to the{" "}
                    <Link
                      href="/terms"
                      className="text-slate-900 font-medium underline underline-offset-2 hover:text-[#b91c1c]"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/privacy"
                      className="text-slate-900 font-medium underline underline-offset-2 hover:text-[#b91c1c]"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </label>
                </div>
              )}

              {/* Remember Me & Forgot Password (Login) */}
              {activeTab === "login" && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#b91c1c] focus:ring-red-500 accent-[#b91c1c] cursor-pointer"
                    />
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setForgotStep("email");
                      setForgotError(null);
                      setForgotSuccess(null);
                      setShowForgotModal(true);
                    }}
                    className="font-semibold text-[#b91c1c] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </>
          )}

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-6 rounded-xl bg-[#b91c1c] hover:bg-[#a11818] active:bg-[#881313] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-heading"
          >
            {loading ? (
              <span>Processing...</span>
            ) : otpRequired ? (
              <>
                <span>Verify Registration Code</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : activeTab === "login" ? (
              <>
                <span>Sign in</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Tab Switching Footer Text */}
        {!otpRequired && (
          <div className="text-center mt-6 text-xs text-slate-600 font-sans">
            {activeTab === "login" ? (
              <p>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchTab("register")}
                  className="font-semibold text-[#b91c1c] hover:underline cursor-pointer ml-1 font-heading"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchTab("login")}
                  className="font-semibold text-[#b91c1c] hover:underline cursor-pointer ml-1 font-heading"
                >
                  Log in
                </button>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Forgot Password Modal (Multi-step OTP flow) */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative animate-scaleUp font-sans">
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-10 h-10 rounded-xl bg-red-50 text-[#b91c1c] flex items-center justify-center mb-4 border border-red-100">
              <Lock className="w-5 h-5 stroke-[2.2]" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 font-heading">
              {forgotStep === "reset" ? "Enter Recovery Code" : "Reset your password"}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {forgotStep === "reset"
                ? `Enter the 6-digit code sent to ${forgotEmail} and your new password.`
                : "Enter your registered email address. We will verify your account and send a 6-digit recovery code."}
            </p>

            {/* Error & Success Messages */}
            {forgotError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {forgotStep === "done" ? (
              <div className="mt-5 space-y-4 text-center">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-800">
                  <p className="font-bold font-heading text-sm text-emerald-900 mb-1">
                    Password Reset Complete
                  </p>
                  <p>You can now sign in to AutoTrace with your new password.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full py-2.5 rounded-xl bg-[#b91c1c] text-white text-xs font-semibold hover:bg-[#a11818] transition font-heading"
                >
                  Proceed to Sign In
                </button>
              </div>
            ) : forgotStep === "reset" ? (
              <form onSubmit={handleForgotResetPassword} className="mt-4 space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      6-Digit Recovery Code
                    </label>
                    <button
                      type="button"
                      onClick={() => setForgotStep("email")}
                      className="text-[11px] text-[#b91c1c] hover:underline"
                    >
                      Change email
                    </button>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    autoFocus
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#f1f4f9] text-slate-900 text-center text-lg font-mono tracking-[0.4em] border border-transparent focus:border-red-500 focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-[#f1f4f9] text-slate-900 text-xs border border-transparent focus:border-red-500 focus:bg-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#f1f4f9] text-slate-900 text-xs border border-transparent focus:border-red-500 focus:bg-white outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2.5 rounded-xl bg-[#b91c1c] text-white text-xs font-semibold hover:bg-[#a11818] transition disabled:opacity-50 font-heading"
                  >
                    {forgotLoading ? "Resetting..." : "Reset Password"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleForgotRequestOtp} className="mt-4 space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Registered Work Email
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#f1f4f9] text-slate-900 text-xs border border-transparent focus:border-red-500 focus:bg-white outline-none"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2.5 rounded-xl bg-[#b91c1c] text-white text-xs font-semibold hover:bg-[#a11818] transition disabled:opacity-50 font-heading"
                  >
                    {forgotLoading ? "Sending Code..." : "Send Recovery Code"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
