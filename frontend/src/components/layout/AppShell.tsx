"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import { useAuth } from "@/context/auth-context";
import { Lock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AuthFooter } from "../auth/AuthFooter";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  hideHeaderTitle?: boolean;
}

export function AppShell({
  children,
  title,
  subtitle,
  hideHeaderTitle = false,
}: AppShellProps) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  const isAdminRoute = pathname?.startsWith("/admin");
  const isAuthorized = !isAdminRoute || user?.role === "Admin";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-slate-500 font-sans text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
          <span className="font-medium">Loading Automatic Backend Detection...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 font-sans">
      {/* Top Horizontal Navigation */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!isAuthorized ? (
          <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center max-w-lg mx-auto mt-12 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)]">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 mx-auto border border-red-100 mb-4">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold font-heading text-slate-900">
              Admin Privileges Required
            </h2>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              {user ? (
                <>
                  You are currently signed in as <strong>{user.name}</strong> (
                  <span className="text-slate-800 font-bold">{user.role}</span>). This section is restricted to Administrator accounts.
                </>
              ) : (
                <>This administrative console requires an Administrator account.</>
              )}
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <Link
                href="/dashboard"
                className="button-primary"
              >
                <ArrowLeft className="h-4 w-4" /> Return to Dashboard
              </Link>

              <Link
                href="/login"
                className="button-secondary"
              >
                Sign In as Admin
              </Link>
            </div>
          </div>
        ) : (
          children
        )}
      </main>

      {/* Global Footer */}
      <AuthFooter />
    </div>
  );
}

export default AppShell;
