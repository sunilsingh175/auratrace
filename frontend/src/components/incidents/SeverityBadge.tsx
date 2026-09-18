"use client";

import React from "react";
import { Severity, IncidentStatus } from "@/types";

interface SeverityBadgeProps {
  severity?: Severity;
  status?: IncidentStatus;
  score?: number;
}

export function SeverityBadge({ severity, status, score }: SeverityBadgeProps) {
  if (status) {
    let statusClass = "bg-slate-800 text-slate-400";
    if (status === "OPEN") statusClass = "status-open";
    if (status === "INVESTIGATING") statusClass = "status-investigating";
    if (status === "RESOLVED") statusClass = "status-resolved";

    return (
      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${statusClass}`}>
        {status}
      </span>
    );
  }

  if (severity) {
    let sevClass = "bg-blue-500/10 text-cyan-400 ring-1 ring-blue-500/20";
    if (severity === "critical") sevClass = "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30";
    if (severity === "high") sevClass = "bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/30";
    if (severity === "medium") sevClass = "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30";
    if (severity === "low") sevClass = "bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/30";

    return (
      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${sevClass}`}>
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
          isCritical ? "text-rose-400" : isHigh ? "text-amber-400" : "text-slate-400"
        }`}
      >
        <span>{pct}%</span>
        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-sans">score</span>
      </span>
    );
  }

  return null;
}
export default SeverityBadge;
