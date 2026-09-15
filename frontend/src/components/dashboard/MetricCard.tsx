"use client";

import React from "react";
import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";

export type MetricTone = "cyan" | "emerald" | "rose" | "amber" | "violet" | "indigo";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  delta?: string;
  deltaType?: "increase" | "decrease" | "neutral";
  subtitle?: string;
  icon: LucideIcon;
  tone?: MetricTone;
}

const toneStyles: Record<
  MetricTone,
  {
    bgIcon: string;
    textIcon: string;
    border: string;
    glow: string;
  }
> = {
  cyan: {
    bgIcon: "bg-cyan-500/10",
    textIcon: "text-cyan-400",
    border: "hover:border-cyan-500/30",
    glow: "shadow-cyan-500/5",
  },
  emerald: {
    bgIcon: "bg-emerald-500/10",
    textIcon: "text-emerald-400",
    border: "hover:border-emerald-500/30",
    glow: "shadow-emerald-500/5",
  },
  rose: {
    bgIcon: "bg-rose-500/10",
    textIcon: "text-rose-400",
    border: "hover:border-rose-500/30",
    glow: "shadow-rose-500/5",
  },
  amber: {
    bgIcon: "bg-amber-500/10",
    textIcon: "text-amber-400",
    border: "hover:border-amber-500/30",
    glow: "shadow-amber-500/5",
  },
  violet: {
    bgIcon: "bg-purple-500/10",
    textIcon: "text-purple-400",
    border: "hover:border-purple-500/30",
    glow: "shadow-purple-500/5",
  },
  indigo: {
    bgIcon: "bg-indigo-500/10",
    textIcon: "text-indigo-400",
    border: "hover:border-indigo-500/30",
    glow: "shadow-indigo-500/5",
  },
};

export function MetricCard({
  title,
  value,
  unit,
  delta,
  deltaType = "neutral",
  subtitle,
  icon: Icon,
  tone = "cyan",
}: MetricCardProps) {
  const styles = toneStyles[tone] || toneStyles.cyan;

  return (
    <div
      className={`panel relative overflow-hidden p-5 transition hover:-translate-y-0.5 ${styles.border} ${styles.glow}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${styles.bgIcon} ${styles.textIcon}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <h3 className="font-mono text-2xl font-extrabold tracking-tight text-white lg:text-3xl">
          {value}
        </h3>
        {unit && <span className="font-mono text-xs font-semibold text-slate-400">{unit}</span>}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-3 text-[11px]">
        {subtitle && <span className="truncate text-slate-400">{subtitle}</span>}
        {delta && (
          <span
            className={`flex items-center gap-1 font-bold ${
              deltaType === "increase"
                ? "text-emerald-400"
                : deltaType === "decrease"
                ? "text-rose-400"
                : "text-slate-400"
            }`}
          >
            {deltaType === "increase" && <TrendingUp className="h-3 w-3" />}
            {deltaType === "decrease" && <TrendingDown className="h-3 w-3" />}
            <span>{delta}</span>
          </span>
        )}
      </div>
    </div>
  );
}
export default MetricCard;
