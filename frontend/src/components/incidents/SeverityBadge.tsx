"use client";

import React from "react";
import { Severity, IncidentStatus } from "@/types";

interface SeverityBadgeProps {
  severity?: Severity;
  status?: IncidentStatus | string;
  score?: number;
}

export function SeverityBadge({ severity, status, score }: SeverityBadgeProps) {
  if (status) {
    const s = String(status).toUpperCase();
    if (s === "OPEN" || s === "DETECTED") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200/80 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 font-heading">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
          Detected
        </span>
      );
    }
    if (s === "INVESTIGATING" || s === "ANALYZING") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 font-heading">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
          Analyzing
        </span>
      );
    }
    if (s === "DIAGNOSIS_READY" || s === "DIAGNOSED") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200/80 px-2.5 py-0.5 text-[10px] font-bold text-purple-700 font-heading">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
          Diagnosis Ready
        </span>
      );
    }
    if (s === "RESOLVED") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 font-heading">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Resolved
        </span>
      );
    }

    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 font-heading uppercase">
        {status}
      </span>
    );
  }

  if (severity) {
    const sev = severity.toLowerCase();
    let sevClass = "bg-slate-100 text-slate-700 border-slate-200";
    if (sev === "critical") sevClass = "bg-rose-50 text-rose-700 border-rose-200";
    if (sev === "high") sevClass = "bg-orange-50 text-orange-700 border-orange-200";
    if (sev === "medium") sevClass = "bg-amber-50 text-amber-700 border-amber-200";
    if (sev === "low") sevClass = "bg-blue-50 text-blue-700 border-blue-200";

    return (
      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider font-heading ${sevClass}`}>
        {severity}
      </span>
    );
  }

  if (typeof score === "number") {
    const pct = Math.round(score * 100);
    const isCritical = pct >= 80;
    const isHigh = pct >= 65;

    return (
      <span
        className={`inline-flex items-center gap-1 font-mono text-xs font-extrabold ${
          isCritical ? "text-rose-600" : isHigh ? "text-amber-600" : "text-slate-600"
        }`}
      >
        <span>{pct}%</span>
        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-sans">score</span>
      </span>
    );
  }

  return null;
}
export default SeverityBadge;
