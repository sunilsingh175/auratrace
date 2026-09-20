"use client";

import React, { useState } from "react";
import {
  User,
  Shield,
  KeyRound,
  Mail,
  Check,
  Calendar,
  Eye,
  EyeOff,
  Copy,
  AlertTriangle,
  Sparkles,
  Lock,
  ShieldCheck,
  Activity,
  Layers,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/context/auth-context";

export default function ProfileSettingsPage() {
  return (
    <ProtectedRoute>
      <ProfileSettingsContent />
    </ProtectedRoute>
  );
}

function ProfileSettingsContent() {
  const { user, updateProfile, changePassword } = useAuth();

  // Profile Edit State
  const [name, setName] = useState(user?.name || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [copiedId, setCopiedId] = useState(false);

  // Sync initial name when user loads
  React.useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsUpdatingProfile(true);
    setProfileSuccess("");
    setProfileError("");

    const res = await updateProfile(name.trim());
    setIsUpdatingProfile(false);
    if (res.success) {
      setProfileSuccess("Profile information updated successfully.");
      setTimeout(() => setProfileSuccess(""), 4000);
    } else {
      setProfileError(res.error || "Failed to update profile.");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess("");
    setPasswordError("");

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setIsChangingPassword(true);
    const res = await changePassword(currentPassword, newPassword);
    setIsChangingPassword(false);
    if (res.success) {
      setPasswordSuccess("Password updated successfully. You can now use your new password.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(""), 5000);
    } else {
      setPasswordError(res.error || "Failed to change password.");
    }
  };

  const copyUserId = () => {
    if (!user?.id) return;
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const isAdmin = user?.role === "Admin";
  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : "SR";

  return (
    <ProtectedRoute role="Developer">
      <AppShell
      title="Profile & Security Settings"
      subtitle="Manage your personal account credentials, profile details, and security configuration"
    >
      <div className="space-y-8 max-w-5xl">
        {/* Header Banner */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                <User className="h-4 w-4" />
              </span>
              <span className="label">Account Settings</span>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
              Profile & Security
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-bold ${
                isAdmin
                  ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                  : "border-blue-500/30 bg-blue-500/10 text-cyan-400"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{isAdmin ? "Administrator Role" : "Developer Role"}</span>
            </span>
          </div>
        </div>

        {/* User Profile Card Summary */}
        <div className="panel bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 p-6 border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-extrabold shadow-xl ${
                  isAdmin
                    ? "bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-indigo-500/20"
                    : "bg-gradient-to-tr from-blue-600 to-cyan-600 text-white shadow-cyan-500/20"
                }`}
              >
                {userInitials}
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-white">{user?.name || "User Account"}</h2>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                  <Mail className="h-3.5 w-3.5 text-slate-500" />
                  <span className="font-mono">{user?.email || "—"}</span>
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] px-1.5 py-0.2 font-semibold">
                    <Check className="h-3 w-3" /> Verified
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Member Since
                </span>
                <span className="font-mono text-slate-200">{user?.created_at || "2026"}</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Account Status
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {user?.status || "Active"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Edit & Password Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* PROFILE FORM */}
          <div className="panel p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <User className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Personal Information
              </h3>
            </div>

            {profileError && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                <Check className="h-4 w-4 flex-shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="field mt-1.5"
                />
              </div>

              <div>
                <label className="label">Work Email (Primary Authentication)</label>
                <input
                  disabled
                  type="email"
                  value={user?.email || ""}
                  className="field mt-1.5 opacity-60 cursor-not-allowed font-mono text-slate-400"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Email is locked to your verified login credentials.
                </p>
              </div>

              <div>
                <label className="label">User Identifier (UUID)</label>
                <div className="flex items-center gap-2 mt-1.5">
                  <input
                    disabled
                    type="text"
                    value={user?.id || ""}
                    className="field font-mono text-[11px] text-cyan-400 opacity-75"
                  />
                  <button
                    type="button"
                    onClick={copyUserId}
                    title="Copy UUID"
                    className="rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-slate-400 hover:text-white hover:border-slate-700 transition"
                  >
                    {copiedId ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingProfile || name === user?.name}
                  className="button-primary w-full disabled:opacity-50"
                >
                  {isUpdatingProfile ? "Saving Changes..." : "Save Profile Details"}
                </button>
              </div>
            </form>
          </div>

          {/* CHANGE PASSWORD FORM */}
          <div className="panel p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <KeyRound className="h-4 w-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Security & Password
              </h3>
            </div>

            {passwordError && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                <Check className="h-4 w-4 flex-shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="label">Current Password</label>
                <div className="relative mt-1.5">
                  <input
                    required
                    type={showCurrentPw ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="field pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="label">New Password</label>
                <div className="relative mt-1.5">
                  <input
                    required
                    type={showNewPw ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="field pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Confirm New Password</label>
                <input
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="field mt-1.5 font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isChangingPassword || !currentPassword || !newPassword}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:from-indigo-500 hover:to-purple-500 w-full disabled:opacity-50"
                >
                  {isChangingPassword ? "Updating Password..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ROLE PRIVILEGES & SESSION MATRIX */}
        <div className="panel p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Assigned Role & Access Entitlements
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-1.5">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-cyan-400" /> Telemetry & Incidents
              </span>
              <p className="text-slate-400 text-[11px]">
                Full access to real-time logs, anomaly streaming, ML Isolation Forest confidence metrics, and RAG diagnosis.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-1.5">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-indigo-400" /> Microservice Management
              </span>
              <p className="text-slate-400 text-[11px]">
                Register microservices, copy SDK API keys, trigger chaos scenarios, and inspect telemetry streams.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-1.5">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-purple-400" /> Administrative Controls
              </span>
              <p className="text-slate-400 text-[11px]">
                {isAdmin
                  ? "Granted: Full access to user lifecycle management, account deletion/suspension, and core infrastructure metrics."
                  : "Restricted: User administration and infrastructure matrix require an authorized Administrator account."}
              </p>
            </div>
          </div>
        </div>
      </div>
      </AppShell>
    </ProtectedRoute>
  );
}
