"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface SummaryMetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  description: string;
  badge?: string;
  icon: LucideIcon;
  tone?: "red" | "emerald" | "amber" | "slate" | "purple" | "blue";
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  sparklineColor?: string;
}

export function SummaryMetricCard({
  title,
  value,
  unit,
  description,
  badge = "Live API",
  icon: Icon,
  tone = "slate",
  trend,
  trendDirection = "neutral",
  sparklineColor,
}: SummaryMetricCardProps) {
  const toneClasses = {
    red: "bg-red-50 text-[#dc2626] border-red-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
  };

  const resolvedSparklineColor =
    sparklineColor ||
    (tone === "red"
      ? "#ef4444"
      : tone === "emerald"
      ? "#10b981"
      : tone === "amber"
      ? "#f59e0b"
      : tone === "purple"
      ? "#a855f7"
      : "#3b82f6");

  return (
    <div className="panel p-6 bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:border-slate-200 hover:shadow-md transition-all relative overflow-hidden group">
      {/* Top row: Label + Badge + Icon */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-heading">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {badge && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 font-heading">
              {badge}
            </span>
          )}
          <div className={`flex h-8 w-8 items-center justify-center rounded-xl border ${toneClasses[tone]}`}>
            <Icon className="h-4 w-4 stroke-[2.2]" />
          </div>
        </div>
      </div>

      {/* Middle row: Big Value + Unit */}
      <div className="flex items-baseline gap-2 my-1">
        <span className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {value}
        </span>
        {unit && (
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-heading">
            {unit}
          </span>
        )}
      </div>

      {/* Trend & Sparkline mini visual */}
      <div className="flex items-center justify-between mt-2 pt-1">
        {trend ? (
          <div className="flex items-center gap-1 text-[11px] font-bold font-heading">
            <span
              className={
                trendDirection === "up"
                  ? "text-emerald-600"
                  : trendDirection === "down"
                  ? "text-rose-600"
                  : "text-slate-500"
              }
            >
              {trendDirection === "up" ? "↑" : trendDirection === "down" ? "↓" : "•"} {trend}
            </span>
          </div>
        ) : (
          <div />
        )}

        {/* Mini sparkline curve */}
        <div className="w-20 h-5 opacity-70 group-hover:opacity-100 transition-opacity">
          <svg viewBox="0 0 80 20" className="w-full h-full overflow-visible">
            <path
              d="M 0,15 Q 15,5 30,12 T 60,8 T 80,11"
              fill="none"
              stroke={resolvedSparklineColor}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* Bottom row: Supporting description */}
      <p className="text-xs text-slate-500 font-sans mt-3 border-t border-slate-50 pt-3">
        {description}
      </p>
    </div>
  );
}
