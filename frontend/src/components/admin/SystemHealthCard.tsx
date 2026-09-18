"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, LucideIcon } from "lucide-react";

interface SystemHealthCardProps {
  name: string;
  role: string;
  status: "healthy" | "degraded" | "offline";
  latency?: string | number;
  metricLabel?: string;
  metricValue?: string | number;
  icon: LucideIcon;
}

export function SystemHealthCard({
  name,
  role,
  status,
  latency,
  metricLabel,
  metricValue,
  icon: Icon,
}: SystemHealthCardProps) {
  const isHealthy = status === "healthy";
  const isDegraded = status === "degraded";

  return (
    <div className="panel p-4 transition hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${
              isHealthy
                ? "bg-emerald-500/10 text-emerald-400"
                : isDegraded
                ? "bg-amber-500/10 text-amber-400"
                : "bg-rose-500/10 text-rose-400"
            }`}
          >
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">{name}</h3>
            <p className="text-[10px] text-slate-500">{role}</p>
          </div>
        </div>

        <span
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
            isHealthy
              ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30"
              : isDegraded
              ? "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30"
              : "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isHealthy ? "bg-emerald-400 animate-pulse" : isDegraded ? "bg-amber-400" : "bg-rose-400"
            }`}
          />
          <span>{status}</span>
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2.5 text-[11px] font-mono">
        {latency !== undefined && (
          <span className="text-slate-400">
            Latency: <strong className="text-slate-200">{latency}</strong>
          </span>
        )}
        {metricLabel && metricValue !== undefined && (
          <span className="text-slate-400 ml-auto">
            {metricLabel}: <strong className="text-cyan-300">{metricValue}</strong>
          </span>
        )}
      </div>
    </div>
  );
}
export default SystemHealthCard;
