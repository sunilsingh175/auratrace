"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  LogOut,
  Radio,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  Settings,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";

interface TopbarProps {
  title?: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isAdmin = user?.role === "Admin";
  const isAdminRoute = pathname?.startsWith("/admin");

  // Derive title from pathname if not provided
  let pageTitle = title;
  let pageSub = subtitle;
  if (!pageTitle) {
    if (pathname === "/dashboard") {
      pageTitle = "System Overview & Command Center";
      pageSub = "Autonomous telemetry ingestion, anomaly detection and AI triage";
    } else if (pathname === "/services") {
      pageTitle = "Service Registry & Microservices";
      pageSub = "Production topologies and ingestion keys";
    } else if (pathname === "/telemetry") {
      pageTitle = "Live Telemetry & Ingestion Pipeline";
      pageSub = "Real-time Redis stream logs and WebSocket broadcast";
    } else if (pathname === "/incidents") {
      pageTitle = "Incident Intelligence Hub";
      pageSub = "Automated outlier diagnostics and RAG analysis";
    } else if (pathname?.startsWith("/incidents/")) {
      pageTitle = "Incident Diagnostic & AI Doctor";
      pageSub = "Root-cause analysis, RAG matching and auto-remediation";
    } else if (pathname === "/admin/dashboard") {
      pageTitle = "Backend Diagnostics Admin Operations";
      pageSub = "Infrastructure health matrix and cluster telemetry";
    } else if (pathname === "/admin/users-services") {
      pageTitle = "Team & Global Services Administration";
      pageSub = "Access control, developer keys and service provisioning";
    } else if (pathname === "/admin/monitoring") {
      pageTitle = "Core Infrastructure Monitoring";
      pageSub = "Redis streams, PostgreSQL pgvector and ML worker telemetry";
    } else {
      pageTitle = "Automatic Backend Diagnostics Platform";
      pageSub = "Autonomous AI Observability & Crash Diagnostics";
    }
  }

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : "SR";

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-6 backdrop-blur-xl">
      {/* Left Title & Breadcrumb */}
      <div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${
              isAdminRoute ? "text-indigo-400" : "text-slate-500"
            }`}
          >
            {isAdminRoute ? "Admin Console" : "Developer Workspace"}
          </span>
          <span className="text-slate-600">/</span>
          <span className="text-xs font-bold text-slate-300">{pageTitle}</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3.5">
        {/* System Health Badge */}
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Cluster Nominal</span>
        </div>

        {/* API Docs link */}
        <Link
          href="http://localhost:8000/docs"
          target="_blank"
          className="hidden md:flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-slate-700 hover:text-white"
        >
          <BookOpen className="h-3.5 w-3.5 text-slate-400" />
          <span>API Docs</span>
          <ExternalLink className="h-3 w-3 text-slate-500" />
        </Link>

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 text-slate-300 transition hover:border-slate-700 hover:text-white"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-lg shadow-rose-500/50">
              2
            </span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-800 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-xs font-bold text-white">Active Anomalies</span>
                <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold text-rose-400">
                  2 Critical
                </span>
              </div>
              <div className="mt-3 space-y-2">
                <Link
                  href="/incidents/INC-1024"
                  onClick={() => setShowNotifications(false)}
                  className="block rounded-xl border border-rose-500/20 bg-rose-500/5 p-2.5 transition hover:bg-rose-500/10"
                >
                  <p className="text-xs font-bold text-rose-300">INC-1024: DB Pool Exhaustion</p>
                  <p className="text-[10px] text-slate-400">Payment API · 94% anomaly confidence</p>
                </Link>
                <Link
                  href="/incidents/INC-1023"
                  onClick={() => setShowNotifications(false)}
                  className="block rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 transition hover:bg-amber-500/10"
                >
                  <p className="text-xs font-bold text-amber-300">INC-1023: Redis Consumer Lag</p>
                  <p className="text-[10px] text-slate-400">Notification Worker · 87% score</p>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Admin Navigation Quick-Toggle (Visible to Admin only) */}
        {isAdmin && (
          <Link
            href={isAdminRoute ? "/dashboard" : "/admin/dashboard"}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
              isAdminRoute
                ? "border-blue-500/30 bg-blue-500/10 text-cyan-300 hover:bg-blue-500/20"
                : "border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{isAdminRoute ? "View Developer Workspace" : "View Admin Console"}</span>
          </Link>
        )}

        {/* Active User Badge or Sign In Button */}
        {user ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 transition hover:border-slate-700 hover:bg-slate-800"
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                  isAdmin
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "bg-blue-500/10 text-cyan-400"
                }`}
              >
                {userInitials}
              </div>

              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-200 leading-tight">
                  {user.name}
                </p>
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider ${
                    isAdmin ? "text-indigo-400" : "text-cyan-400"
                  }`}
                >
                  {user.role}
                </span>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-800 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-2xl">
                <div className="border-b border-slate-800 pb-2.5">
                  <p className="text-xs font-bold text-white">{user.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                  <span
                    className={`mt-1 inline-block rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                      isAdmin ? "bg-indigo-500/20 text-indigo-300" : "bg-blue-500/10 text-cyan-400"
                    }`}
                  >
                    Role: {user.role}
                  </span>
                </div>

                <div className="mt-2 space-y-1">
                  {isAdmin ? (
                    <Link
                      href="/admin/users-services"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
                    >
                      <Shield className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Manage Team & Access</span>
                    </Link>
                  ) : (
                    <Link
                      href="/services"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
                    >
                      <User className="h-3.5 w-3.5 text-cyan-400" />
                      <span>My Services</span>
                    </Link>
                  )}

                  <Link
                    href="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
                  >
                    <Settings className="h-3.5 w-3.5 text-purple-400" />
                    <span>Profile & Security</span>
                  </Link>


                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 transition"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-indigo-500"
          >
            <User className="h-3.5 w-3.5" />
            <span>Sign In</span>
          </Link>
        )}
      </div>
    </header>
  );
}
export default Topbar;
