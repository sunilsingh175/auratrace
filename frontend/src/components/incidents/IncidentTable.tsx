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
  Layers,
} from "lucide-react";
import { Incident } from "@/types";
import { SeverityBadge } from "./SeverityBadge";
import { formatTimeAgo } from "@/lib/utils";

interface IncidentTableProps {
  incidents: Incident[];
  onRefresh?: () => void;
}

export function IncidentTable({ incidents }: IncidentTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = incidents.filter((inc) => {
    if (statusFilter === "ACTIVE" && inc.status === "RESOLVED") return false;
    if (statusFilter === "RESOLVED" && inc.status !== "RESOLVED") return false;
    if (
      statusFilter === "DIAGNOSED" &&
      !((inc as any).is_diagnosed || inc.ai_root_cause || (inc as any).suggested_patch)
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

  return (
    <div className="space-y-4">
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
      ) : (
        <div className="space-y-3">
          {filtered.map((inc) => {
            const scorePct = Math.round(inc.anomaly_score * 100);
            const appName = inc.service_id || "Unknown application";
            const crashTitle =
              inc.title ||
              (inc.error_type === "PoolTimeout" || inc.error_type === "ConnectionPoolTimeout"
                ? "Database connection pool exhausted"
                : inc.error_type === "RedisConnectionRefused"
                ? "Redis cache connection refused"
                : inc.error_type === "OutOfMemoryError"
                ? "Node process heap out of memory"
                : inc.error_type || "Unhandled Application Exception");

            const isDiagnosed = Boolean(
              (inc as any).is_diagnosed || inc.ai_root_cause || (inc as any).suggested_patch
            );

            return (
              <div
                key={inc.id}
                className="panel p-5 bg-white border-slate-100 hover:border-slate-300 transition-all shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                {/* Left Section: Severity, Crash Name, Detected App Context */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="pt-0.5 shrink-0">
                    <SeverityBadge severity={inc.severity || "high"} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/incidents/${inc.id}`}
                        className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition font-heading truncate"
                      >
                        {crashTitle}
                      </Link>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500 font-sans">
                      <span className="font-semibold text-slate-700">
                        {appName}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-400">
                        Detected automatically
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(inc.created_at)}
                      </span>
                    </div>

                    {inc.error_type && (
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] font-mono text-slate-600 border border-slate-200/60">
                        <Terminal className="h-3 w-3 text-slate-400" />
                        <span className="truncate max-w-md">{inc.error_type}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Section: Lifecycle Status & Primary CTA */}
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                  {isDiagnosed ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200/80 px-2.5 py-1 text-xs font-bold text-purple-700 font-heading">
                      <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                      AI Diagnosis Ready
                    </span>
                  ) : inc.status === "RESOLVED" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-xs font-bold text-emerald-700 font-heading">
                      ✓ Resolved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/80 px-2.5 py-1 text-xs font-bold text-amber-700 font-heading">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                      Analyzing
                    </span>
                  )}

                  <Link
                    href={`/incidents/${inc.id}`}
                    className="button-primary text-xs py-2 px-4 inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <span>View Crash &amp; Fix</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default IncidentTable;
