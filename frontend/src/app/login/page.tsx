"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Key,
  Lock,
  ArrowRight,
  ShieldCheck,
  Activity,
  Terminal,
  Server,
  User,
  Shield,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();

  const [apiKey, setApiKey] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<"Developer" | "Admin">("Developer");
  const [authMode, setAuthMode] = useState<"credentials" | "apikey">("credentials");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Google Modal State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState("sunilsinghrajput192@gmail.com");
  const [googleNameInput, setGoogleNameInput] = useState("Sunil Singh");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    const result = await login({
      email: authMode === "credentials" ? email : undefined,
      password: authMode === "credentials" ? password : undefined,
      role: selectedRole,
      apiKey: authMode === "apikey" ? apiKey : undefined,
    });

    if (result.success) {
      if (result.role === "Admin" || selectedRole === "Admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/dashboard");
      }
    } else {
      setErrorMessage(result.error || "Authentication failed.");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const result = await loginWithGoogle({
      role: selectedRole,
      email: googleEmailInput,
      name: googleNameInput,
    });
    setShowGoogleModal(false);
    if (result.role === "Admin") {
      router.push("/admin/dashboard");
    } else {
      router.push("/dashboard");
    }
  };

  const handleDemoBypass = async (role: "Developer" | "Admin") => {
    setLoading(true);
    if (role === "Admin") {
      await login({ email: "admin@auratrace.io", role: "Admin" });
      router.push("/admin/dashboard");
    } else {
      await login({ email: "sunil@auratrace.io", role: "Developer" });
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-[#080c14] relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-600/15 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-indigo-600/15 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-purple-600/5 blur-[140px] pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="panel border-slate-800/90 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-2xl">
          {/* Logo & Platform Name */}
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-1 shadow-[0_0_30px_rgba(59,130,246,0.35)]">
              <div className="flex h-full w-full items-center justify-center rounded-[12px] bg-slate-950">
                <Sparkles className="h-7 w-7 text-cyan-300" />
              </div>
            </div>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-white">
              AuraTrace Console
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Autonomous AI Observability & Crash Diagnostics
            </p>
          </div>

          {/* Role Selector Tabs */}
          <div className="mt-6">
            <span className="label block mb-2 text-center text-slate-500">Select Access Role</span>
            <div className="flex rounded-xl border border-slate-800 bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => setSelectedRole("Developer")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
                  selectedRole === "Developer"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span>Developer</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("Admin")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
                  selectedRole === "Admin"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Admin</span>
              </button>
            </div>
          </div>

          {/* Google Sign-in Button */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowGoogleModal(true)}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-700/80 bg-slate-950/80 py-2.5 px-4 text-xs font-bold text-slate-200 shadow-md transition hover:border-slate-500 hover:bg-slate-900"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.29 21.36 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.99 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.29 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google as {selectedRole}</span>
            </button>
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-mono">
              <span className="bg-slate-900 px-2 text-slate-500">or sign in with password</span>
            </div>
          </div>

          {/* Mode Switch: Credentials vs API Key */}
          <div className="flex rounded-xl border border-slate-800/80 bg-slate-950/60 p-1">
            <button
              type="button"
              onClick={() => setAuthMode("credentials")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-semibold transition ${
                authMode === "credentials"
                  ? "bg-slate-800 text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Lock className="h-3 w-3" /> Credentials
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("apikey")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-semibold transition ${
                authMode === "apikey"
                  ? "bg-slate-800 text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Key className="h-3 w-3" /> Master API Key
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="mt-4 space-y-4">
            {authMode === "credentials" ? (
              <>
                <div>
                  <label className="label">Work Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={selectedRole === "Admin" ? "admin@auratrace.io" : "sunil@auratrace.io"}
                    className="field mt-1.5"
                  />
                </div>

                <div>
                  <label className="label">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="field mt-1.5 font-mono"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="label">AuraTrace Master API Key</label>
                <div className="relative mt-1.5">
                  <Key className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="at_live_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2.5 pl-9 pr-4 text-xs font-mono text-slate-200 outline-none transition focus:border-blue-500"
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-500 font-mono">
                  From .env: <code className="text-cyan-400">AURA_MASTER_API_KEY</code>
                </p>
              </div>
            )}

            {errorMessage && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-white shadow-lg transition ${
                selectedRole === "Admin"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 shadow-indigo-600/25 hover:from-indigo-500 hover:to-purple-500"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-600/25 hover:from-blue-500 hover:to-indigo-500"
              }`}
            >
              {loading ? (
                <span>Authenticating Cluster...</span>
              ) : (
                <>
                  <span>Sign In as {selectedRole}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Role Demo Shortcuts */}
          <div className="mt-6 border-t border-slate-800/80 pt-4 text-center space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Quick Demo Access
            </span>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => handleDemoBypass("Developer")}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition"
              >
                Developer Workspace →
              </button>
              <span className="text-slate-700">•</span>
              <button
                type="button"
                onClick={() => handleDemoBypass("Admin")}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition"
              >
                Admin Command Center →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Google Account Selector Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="panel w-full max-w-sm border-slate-700 p-6 shadow-2xl bg-slate-900">
            <div className="text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white shadow">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.29 21.36 7.35 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.99 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.29 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              </div>
              <h3 className="mt-3 text-sm font-bold text-white">Sign in with Google</h3>
              <p className="text-xs text-slate-400">Authenticate to AuraTrace Telemetry</p>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Google Account Name</label>
                <input
                  type="text"
                  value={googleNameInput}
                  onChange={(e) => setGoogleNameInput(e.target.value)}
                  className="field mt-1"
                />
              </div>

              <div>
                <label className="label">Google Email</label>
                <input
                  type="email"
                  value={googleEmailInput}
                  onChange={(e) => setGoogleEmailInput(e.target.value)}
                  className="field mt-1"
                />
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Logging in with Role
                </span>
                <span
                  className={`text-xs font-bold mt-0.5 inline-block ${
                    selectedRole === "Admin" ? "text-indigo-400" : "text-cyan-400"
                  }`}
                >
                  {selectedRole} (Configurable in top tabs)
                </span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="button-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="button-primary"
              >
                Authenticate Google Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
