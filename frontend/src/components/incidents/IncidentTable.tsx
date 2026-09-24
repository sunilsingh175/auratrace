"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Search,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Activity,
  Terminal,
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

  const renderCrashCard = (inc: Incident) => {
    const score = inc.anomaly_score;
    const appName = inc.service_id || "Unknown application";
    const crashTitle =
      inc.title ||
      inc.error_type ||
      `Unhandled Exception in ${appName}`;

    const isDiagnosed = Boolean(
      inc.is_diagnosed || (inc as any).ai_root_cause || (inc as any).suggested_patch
    );
    const isResolved = inc.status === "RESOLVED";

    return (
      <div
        key={inc.id}
        className={`panel p-6 bg-white transition-all shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-5 group ${
          isResolved
            ? "border-slate-200/80 hover:border-slate-300"
            : "border-rose-100/90 hover:border-rose-300"
        }`}
      >
        {/* Left Section: Severity, Crash Name, Application Context & Metadata */}
        <div className="flex flex-col gap-3 min-w-0 flex-1">
          {/* Top Row: Severity & Title */}
          <div className="flex items-start gap-3">
            <div className="shrink-0 pt-0.5">
              <SeverityBadge severity={inc.severity || "high"} />
            </div>

            <div className="min-w-0 flex-1">
              <Link
                href={`/incidents/${inc.id}`}
                className="text-base font-bold text-slate-900 group-hover:text-red-600 transition font-heading truncate block"
              >
                {crashTitle}
              </Link>
              <p className="text-xs font-semibold text-slate-600 font-sans mt-0.5">
                {appName}
              </p>
            </div>
          </div>

          {/* Details Row: Detected time, Anomaly score, AI Diagnosis badge */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-sans pl-0 sm:pl-1">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>Detected: <strong className="text-slate-700 font-semibold">{formatTimeAgo(inc.created_at)}</strong></span>
            </div>

            {typeof score === "number" && score > 0 && (
              <>
                <span className="text-slate-300">•</span>
                <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                  <Activity className="h-3.5 w-3.5 text-rose-500" />
                  <span>Anomaly Score: <strong className="text-rose-600 font-bold">{score.toFixed(4)}</strong></span>
                </div>
              </>
            )}

            <span className="text-slate-300">•</span>
            {isResolved ? (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px] font-heading">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                Resolved
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full text-[11px] font-heading">
                <Sparkles className="h-3 w-3 text-purple-600" />
                AI Diagnosis: {isDiagnosed ? "Ready" : "Analyzing..."}
              </span>
            )}
          </div>
        </div>

        {/* Right Section: View Crash & Fix CTA */}
        <div className="shrink-0 self-end sm:self-auto pt-2 sm:pt-0">
          <Link
            href={`/incidents/${inc.id}`}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold font-heading transition cursor-pointer shadow-xs ${
              isResolved
                ? "bg-slate-100 hover:bg-slate-200 text-slate-800"
                : "bg-[#dc2626] hover:bg-[#b91c1c] text-white"
            }`}
          >
            <span>View Crash &amp; Fix</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)]">
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
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition font-heading cursor-pointer ${
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
            placeholder="Search crashes..."
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
            No crashes match your filter criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inc) => renderCrashCard(inc))}
        </div>
      )}
    </div>
  );
}

export default IncidentTable;
