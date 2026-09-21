"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface SystemHealthCardProps {
  name: string;
  role: string;
  status: "healthy" | "degraded" | "offline" | "unknown";
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
  const isUnknown = status === "unknown";

  return (
    <div className="panel p-4 transition hover:-translate-y-0.5 hover:shadow-md hover:border-slate-200">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${
              isHealthy
                ? "bg-emerald-50 text-emerald-600"
                : isDegraded
                ? "bg-amber-50 text-amber-600"
                : isUnknown
                ? "bg-slate-100 text-slate-500"
                : "bg-rose-50 text-rose-600"
            }`}
          >
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 font-heading">{name}</h3>
            <p className="text-[10px] text-slate-400">{role}</p>
          </div>
        </div>

        <span
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
            isHealthy
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : isDegraded
              ? "bg-amber-50 text-amber-700 border border-amber-200"
              : isUnknown
              ? "bg-slate-100 text-slate-600 border border-slate-200"
              : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isHealthy ? "bg-emerald-500 animate-pulse" : isDegraded ? "bg-amber-500" : isUnknown ? "bg-slate-400" : "bg-rose-500"
            }`}
          />
          <span>{status}</span>
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] font-mono">
        {latency !== undefined && (
          <span className="text-slate-500">
            Latency: <strong className="text-slate-800">{latency}</strong>
          </span>
        )}
        {metricLabel && metricValue !== undefined && (
          <span className="text-slate-500 ml-auto">
            {metricLabel}: <strong className="text-red-600 font-bold">{metricValue}</strong>
          </span>
        )}
      </div>
    </div>
  );
}
export default SystemHealthCard;
