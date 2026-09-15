"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useAuth } from "@/context/auth-context";
import { ShieldAlert, ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function AppShell({ children, title, subtitle }: AppShellProps) {
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();

  const isAdminRoute = pathname?.startsWith("/admin");
  const isAuthorized = !isAdminRoute || user?.role === "Admin";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center text-slate-400 font-mono text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <span>Loading AuraTrace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100">
      <Sidebar />
      <div className="pl-64 flex flex-col min-h-screen">
        <Topbar title={title} subtitle={subtitle} />
        <main className="flex-1 p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {!isAuthorized ? (
            <div className="panel border-rose-500/30 bg-slate-900/90 p-12 text-center max-w-xl mx-auto mt-12 shadow-2xl">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30 mx-auto">
                <Lock className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-lg font-extrabold text-white">
                Admin Privileges Required
              </h2>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                {user ? (
                  <>
                    You are currently signed in as <strong>{user.name}</strong> (
                    <span className="text-cyan-400 font-bold">{user.role}</span>). This administrative
                    section is restricted to users with the <strong>Admin</strong> role.
                  </>
                ) : (
                  <>This administrative section is restricted to authorized Administrators. Please sign in with an Admin account.</>
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
      </div>
    </div>
  );
}
export default AppShell;
