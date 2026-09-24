"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  KeyRound,
  Mail,
  Check,
  Eye,
  EyeOff,
  Copy,
  AlertTriangle,
  Lock,
  Shield,
  Activity,
  Layers,
  Code,
  Calendar,
  CheckCircle2,
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
  useEffect(() => {
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
      setProfileSuccess("Profile details updated successfully.");
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
      setPasswordSuccess("Password updated successfully.");
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
    : "U";

  return (
    <AppShell hideHeaderTitle>
      <div className="w-full space-y-5 pb-16 font-sans">
        {/* Top Header Label */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
            Account Settings &amp; Security
          </span>
          <span className="text-[11px] font-bold text-slate-400 font-mono">
            ID: {user?.id ? `${user.id.substring(0, 13)}...` : "—"}
          </span>
        </div>

        {/* 1. Compact Profile Summary Header */}
        <div className="panel p-5 bg-white border-slate-100 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="h-11 w-11 rounded-xl bg-red-100 text-[#dc2626] font-extrabold text-sm flex items-center justify-center font-heading shrink-0 border border-red-200/60">
              {userInitials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 font-heading truncate">
                  {user?.name || "Automatic Backend Detection Developer"}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-heading border ${
                    isAdmin
                      ? "bg-red-50 text-[#dc2626] border-red-100"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {isAdmin ? "Admin" : "Developer"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 truncate">
                <span className="truncate">{user?.email || "developer@autotrace.dev"}</span>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  Verified
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <div className="text-right hidden md:block">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-heading block">
                Member Since
              </span>
              <span className="font-mono text-xs font-semibold text-slate-700">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "2026-09-24"}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-heading block">
                Status
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {user?.status || "Active"}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Main Two-Column Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Card 1: Personal Information */}
          <div className="panel p-5 bg-white border-slate-100 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-[#dc2626]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-heading">
                  Personal Information
                </h3>
              </div>
            </div>

            {profileError && (
              <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-700 flex items-center gap-2">
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 font-heading">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2 text-xs font-medium text-slate-900 outline-none transition focus:border-red-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 font-heading">
                  Work Email (Primary Authentication)
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || "developer@autotrace.dev"}
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-mono text-slate-500 cursor-not-allowed"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Email is locked to your verified login credentials.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 font-heading">
                  User Identifier (UUID)
                </label>
                <div className="flex">
                  <input
                    type="text"
                    disabled
                    value={user?.id || "5be15cc3-18ae-4f6f-a437-b34c57ead43e"}
                    className="w-full rounded-l-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-mono text-slate-500 cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={copyUserId}
                    title="Copy UUID"
                    className="bg-white border border-l-0 border-slate-200 rounded-r-xl px-3 hover:bg-slate-50 text-slate-600 transition cursor-pointer flex items-center justify-center"
                  >
                    {copiedId ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isUpdatingProfile || name === user?.name}
                  className="button-primary px-4 py-2 text-xs font-heading font-bold disabled:opacity-50 cursor-pointer"
                >
                  {isUpdatingProfile ? "Saving..." : "Save Details"}
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Security & Password */}
          <div className="panel p-5 bg-white border-slate-100 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-[#dc2626]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-heading">
                  Security &amp; Password
                </h3>
              </div>
            </div>

            {passwordError && (
              <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-700 flex items-center gap-2">
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 font-heading">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2 pr-9 text-xs font-medium text-slate-900 outline-none transition focus:border-red-500 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrentPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 font-heading">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPw ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2 pr-9 text-xs font-medium text-slate-900 outline-none transition focus:border-red-500 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 font-heading">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3.5 py-2 text-xs font-medium text-slate-900 outline-none transition focus:border-red-500 focus:bg-white"
                />
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isChangingPassword || !currentPassword || !newPassword}
                  className="button-primary px-4 py-2 text-xs font-heading font-bold disabled:opacity-50 cursor-pointer"
                >
                  {isChangingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* 3. Role & Permissions Matrix */}
        <div className="panel p-5 bg-white border-slate-100 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-heading">
                Role &amp; Permissions
              </h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-heading bg-slate-100 text-slate-700 border border-slate-200">
              {isAdmin ? "Admin Role" : "Developer Role"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-slate-100 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5 font-heading">
                <Activity className="h-3.5 w-3.5 text-rose-600" />
                <span>Telemetry &amp; Crashes</span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Full access to real-time logs, anomaly streaming, ML Isolation Forest detection, and AI fixes.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-slate-100 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5 font-heading">
                <Layers className="h-3.5 w-3.5 text-purple-600" />
                <span>Workspaces &amp; SDK Keys</span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Create application projects, copy SDK API keys, and connect Node.js/Python services.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-slate-100 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5 font-heading">
                <Lock className="h-3.5 w-3.5 text-slate-700" />
                <span>Administrative Governance</span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                {isAdmin
                  ? "Granted: Full access to user account management, workspace purging, and system health."
                  : "Restricted: User administration and workspace purging require an Administrator account."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
