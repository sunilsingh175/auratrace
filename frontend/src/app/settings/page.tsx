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
        .substring(0, 1)
    : "A";

  return (
    <AppShell
      title="Profile & Security Settings"
      subtitle="Manage your personal account credentials, profile details, and security configuration."
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Profile Banner */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-6 text-white shadow-sm flex flex-col md:flex-row justify-between items-center md:items-start gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-rose-500 rounded-lg flex items-center justify-center text-2xl font-bold shadow-inner font-heading shrink-0">
              {userInitials}
            </div>
            <div>
              <h2 className="text-2xl font-semibold font-heading">{user?.name || "Aadesh"}</h2>
              <div className="flex items-center gap-2 text-slate-300 text-sm mt-1 font-sans flex-wrap">
                <Mail className="h-4 w-4" />
                <span>{user?.email || "aadeshyadav.2301068@srec.ac.in"}</span>
                <span className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded text-xs border border-green-500/30 inline-flex items-center gap-1 font-medium">
                  <Check className="h-3 w-3" />
                  Verified
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-600/50">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-heading">Member Since</p>
              <p className="font-medium font-mono text-sm">{user?.created_at || "2026-09-21"}</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-600/50">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-heading">Account Status</p>
              <p className="font-medium text-green-400 flex items-center gap-1.5 text-sm">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                {user?.status || "Active"}
              </p>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-2 flex items-center font-heading">
              <User className="mr-2 h-5 w-5 text-rose-500" />
              Personal Information
            </h3>

            {profileError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                <Check className="h-4 w-4 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-heading">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose-500 focus:outline-none transition-colors text-sm text-gray-900 font-sans"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-heading">
                  Work Email (Primary Authentication)
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || "aadeshyadav.2301068@srec.ac.in"}
                  className="w-full bg-gray-100 border border-gray-200 text-gray-500 rounded-lg px-4 py-2 cursor-not-allowed text-sm font-sans"
                />
                <p className="text-xs text-gray-400 mt-1 font-sans">
                  Email is locked to your verified login credentials.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-heading">
                  User Identifier (UUID)
                </label>
                <div className="flex">
                  <input
                    type="text"
                    disabled
                    value={user?.id || "5be15cc3-18ae-4f6f-a437-b34c57ead43e"}
                    className="w-full bg-gray-100 border border-gray-200 text-gray-500 rounded-l-lg px-4 py-2 cursor-not-allowed font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={copyUserId}
                    title="Copy UUID"
                    className="bg-white border border-l-0 border-gray-200 rounded-r-lg px-4 hover:bg-gray-50 text-gray-500 transition-colors flex items-center justify-center cursor-pointer"
                  >
                    {copiedId ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={isUpdatingProfile || name === user?.name}
                className="w-full bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-medium py-2.5 rounded-lg transition-colors mt-2 disabled:opacity-50 cursor-pointer font-heading"
              >
                {isUpdatingProfile ? "Saving..." : "Save Profile Details"}
              </button>
            </form>
          </div>

          {/* Security & Password */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-2 flex items-center font-heading">
              <KeyRound className="mr-2 h-5 w-5 text-rose-500" />
              Security &amp; Password
            </h3>

            {passwordError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                <Check className="h-4 w-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-heading">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose-500 focus:outline-none transition-colors text-sm pr-10 font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-heading">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPw ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose-500 focus:outline-none transition-colors text-sm pr-10 font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-heading">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-rose-500 focus:outline-none transition-colors text-sm font-sans"
                />
              </div>
              <button
                type="submit"
                disabled={isChangingPassword || !currentPassword || !newPassword}
                className="w-full bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-medium py-2.5 rounded-lg transition-colors mt-2 disabled:opacity-50 cursor-pointer font-heading"
              >
                {isChangingPassword ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>
        </div>

        {/* Role & Entitlements */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center font-heading">
              <Shield className="mr-2 h-5 w-5 text-emerald-500" />
              Assigned Role &amp; Access Entitlements
            </h3>
            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium border border-gray-200 inline-flex items-center gap-1 font-heading">
              <Code className="h-3.5 w-3.5" />
              {isAdmin ? "Administrator Role" : "Developer Role"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-100 bg-gray-50 rounded-lg p-4 hover:border-gray-200 transition-colors">
              <h4 className="font-semibold text-gray-800 flex items-center mb-2 font-heading">
                <Activity className="text-rose-500 mr-2 h-4 w-4" />
                Telemetry &amp; Incidents
              </h4>
              <p className="text-sm text-gray-500 leading-relaxed font-sans">
                Full access to real-time logs, anomaly streaming, ML Isolation Forest confidence metrics, and RAG diagnosis.
              </p>
            </div>

            <div className="border border-gray-100 bg-gray-50 rounded-lg p-4 hover:border-gray-200 transition-colors">
              <h4 className="font-semibold text-gray-800 flex items-center mb-2 font-heading">
                <Layers className="text-rose-500 mr-2 h-4 w-4" />
                Microservice Management
              </h4>
              <p className="text-sm text-gray-500 leading-relaxed font-sans">
                Register microservices, copy SDK API keys, trigger chaos scenarios, and inspect telemetry streams.
              </p>
            </div>

            <div className="border border-gray-100 bg-gray-50 rounded-lg p-4 hover:border-gray-200 transition-colors">
              <h4 className="font-semibold text-gray-800 flex items-center mb-2 font-heading">
                <Lock className="text-rose-500 mr-2 h-4 w-4" />
                Administrative Controls
              </h4>
              <p className="text-sm text-gray-500 leading-relaxed font-sans">
                {isAdmin
                  ? "Granted: Full access to user lifecycle management, account deletion/suspension, and core infrastructure metrics."
                  : "Restricted: User administration and infrastructure matrix require an authorized Administrator account."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
