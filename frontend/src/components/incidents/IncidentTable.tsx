"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Search,
  Sparkles,
  ShieldCheck,
  Terminal,
  Clock,
  CheckCircle2,
  Server,
} from "lucide-react";
import { Incident } from "@/types";
import { SeverityBadge } from "./SeverityBadge";

interface IncidentTableProps {
  incidents: Incident[];
  onRefresh?: () => void;
}

function formatTime(value: unknown): string {
  if (!value) return "Just now";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function IncidentTable({ incidents }: IncidentTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = incidents.filter((inc) => {
    if (statusFilter === "ACTIVE" && inc.status === "RESOLVED") return false;
    if (statusFilter === "RESOLVED" && inc.status !== "RESOLVED") return false;
    if (
      statusFilter === "DIAGNOSED" &&
      !(inc.is_diagnosed || (inc as any).ai_root_cause || (inc as any).suggested_patch)
    ) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        inc.id.toLowerCase().includes(q) ||
        inc.service_id.toLowerCase().includes(q) ||
        inc.title?.toLowerCase().includes(q) ||
        inc.error_type?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeCrashes = filtered.filter((i) => i.status !== "RESOLVED");
  const resolvedCrashes = filtered.filter((i) => i.status === "RESOLVED");

  const renderCrashCard = (inc: Incident, isActiveSection: boolean) => {
    const score = inc.anomaly_score;
    const appName = inc.service_id || "Unknown application";
    const crashTitle =
      inc.title ||
      (inc.error_type === "PoolTimeout" || inc.error_type === "ConnectionPoolTimeout"
        ? `ConnectionPoolTimeout in ${appName}`
        : inc.error_type === "RedisConnectionRefused"
        ? `ConnectionRefusedError in ${appName}`
        : inc.error_type === "OutOfMemoryError"
        ? `OutOfMemoryError in ${appName}`
        : inc.error_type
        ? `${inc.error_type} in ${appName}`
        : "Unhandled Application Exception");

    const isDiagnosed = Boolean(
      inc.is_diagnosed || (inc as any).ai_root_cause || (inc as any).suggested_patch
    );

    if (!isActiveSection) {
      // Clean Resolved Crash Card
      return (
        <div
          key={inc.id}
          className="panel p-5 bg-white border-slate-100 hover:border-slate-300 transition-all shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
        >
          <div className="min-w-0 flex-1">
            <Link
              href={`/incidents/${inc.id}`}
              className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition font-heading truncate block"
            >
              {crashTitle}
            </Link>

            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500 font-sans">
              <span>Application: <strong className="text-slate-700 font-semibold">{appName}</strong></span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Resolved
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-purple-700 font-medium">
                {isDiagnosed ? "AI diagnosis available" : "No diagnosis"}
              </span>
            </div>
          </div>

          <div className="shrink-0 self-end sm:self-auto">
            <Link
              href={`/incidents/${inc.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 hover:text-slate-900 px-4 py-2 text-xs font-bold font-heading transition cursor-pointer"
            >
              <span>View Crash &amp; Fix</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      );
    }

    // Active Crash Card
    return (
      <div
        key={inc.id}
        className="panel p-5 bg-white border-rose-100 hover:border-rose-300 transition-all shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
      >
        {/* Left Section: Severity, Crash Name, Detected App Context */}
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <div className="pt-0.5 shrink-0">
            <SeverityBadge severity={inc.severity || "high"} />
          </div>

          <div className="min-w-0 flex-1">
            <Link
              href={`/incidents/${inc.id}`}
              className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition font-heading truncate block"
            >
              {crashTitle}
            </Link>

            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500 font-sans">
              <div className="flex items-center gap-1">
                <Server className="h-3 w-3 text-slate-400" />
                <span>Application: <strong className="text-slate-800 font-semibold">{appName}</strong></span>
              </div>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1 text-slate-400">
                <Clock className="h-3 w-3" />
                Detected: {formatTime(inc.created_at)}
              </span>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
              {inc.error_type && (
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] font-mono text-slate-600 border border-slate-200/60">
                  <Terminal className="h-3 w-3 text-slate-400" />
                  <span>Error: {inc.error_type}</span>
                </div>
              )}

              <div className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 border border-purple-200/80 px-2.5 py-1 text-[11px] font-bold text-purple-700 font-heading">
                <Sparkles className="h-3 w-3 text-purple-600" />
                <span>AI Diagnosis: {isDiagnosed ? "Ready" : "Diagnosing..."}</span>
              </div>

              {typeof score === "number" && score > 0 && (
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50/70 border border-rose-200/60 px-2.5 py-1 text-[11px] font-mono text-rose-700 font-semibold">
                  <span>Anomaly Score: {score.toFixed(4)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Primary CTA */}
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          <Link
            href={`/incidents/${inc.id}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white px-4 py-2.5 text-xs font-bold font-heading shadow-xs transition cursor-pointer"
          >
            <span>View Crash &amp; Fix</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)]">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "ALL", label: "All Crashes" },
            { id: "ACTIVE", label: "Active" },
            { id: "DIAGNOSED", label: "Diagnosis Ready" },
            { id: "RESOLVED", label: "Resolved" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStatusFilter(item.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition font-heading cursor-pointer ${
                statusFilter === item.id
                  ? "bg-[#dc2626] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search crashes by error or app..."
            className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] py-1.5 pl-9 pr-3.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Crash Cards Feed */}
      {filtered.length === 0 ? (
        <div className="panel p-12 text-center bg-white border-slate-100">
          <ShieldCheck className="mx-auto h-10 w-10 text-emerald-500" />
          <p className="mt-3 text-sm font-bold text-slate-800 font-heading">
            No Crashes Found
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            No crashes match the current filters.
          </p>
        </div>
      ) : statusFilter === "ALL" ? (
        <div className="space-y-6">
          {/* Active Crashes Group */}
          {activeCrashes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-rose-600 animate-pulse" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-rose-700 font-heading">
                  Active Crashes ({activeCrashes.length})
                </h2>
              </div>
              <div className="space-y-3">
                {activeCrashes.map((inc) => renderCrashCard(inc, true))}
              </div>
            </div>
          )}

          {/* Resolved Crashes Group */}
          {resolvedCrashes.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
                  Resolved Crashes ({resolvedCrashes.length})
                </h2>
              </div>
              <div className="space-y-3">
                {resolvedCrashes.map((inc) => renderCrashCard(inc, false))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inc) => renderCrashCard(inc, inc.status !== "RESOLVED"))}
        </div>
      )}
    </div>
  );
}

export default IncidentTable;
