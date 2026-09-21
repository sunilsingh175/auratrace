"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: string;
  trendPositive?: boolean;
  subtitle?: string;
  icon: LucideIcon;
  tone?: "blue" | "red" | "teal" | "purple" | "green" | "amber";
  sparklineColor?: string;
}

export function MetricCard({
  title,
  value,
  unit,
  trend,
  trendPositive = true,
  subtitle,
  icon: Icon,
  tone = "blue",
  sparklineColor,
}: MetricCardProps) {
  const toneStyles = {
    blue: {
      iconBg: "bg-blue-50 text-blue-600 border-blue-100",
      sparkline: "#3b82f6",
    },
    red: {
      iconBg: "bg-red-50 text-[#dc2626] border-red-100",
      sparkline: "#ef4444",
    },
    teal: {
      iconBg: "bg-teal-50 text-teal-600 border-teal-100",
      sparkline: "#14b8a6",
    },
    purple: {
      iconBg: "bg-purple-50 text-purple-600 border-purple-100",
      sparkline: "#a855f7",
    },
    green: {
      iconBg: "bg-emerald-50 text-emerald-600 border-emerald-100",
      sparkline: "#10b981",
    },
    amber: {
      iconBg: "bg-amber-50 text-amber-600 border-amber-100",
      sparkline: "#f59e0b",
    },
  };

  const currentTone = toneStyles[tone] || toneStyles.blue;
  const strokeColor = sparklineColor || currentTone.sparkline;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
      {/* Top row with icon and title */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center border ${currentTone.iconBg}`}
          >
            <Icon className="w-4 h-4 stroke-[2.2]" />
          </div>
        </div>

        <span className="text-xs font-semibold text-slate-500 block mb-1">
          {title}
        </span>

        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-[26px] font-extrabold font-heading text-slate-900 tracking-tight">
            {value}
          </span>
          {unit && (
            <span className="text-xs font-medium text-slate-500">{unit}</span>
          )}
        </div>
      </div>

      {/* Bottom row with trend indicator or subtitle and mini sparkline */}
      <div className="mt-4 pt-2 flex items-end justify-between">
        {trend ? (
          <div className="flex items-center gap-1 text-xs font-semibold">
            <span
              className={trendPositive ? "text-emerald-600" : "text-red-600"}
            >
              {trend}
            </span>
          </div>
        ) : subtitle ? (
          <span className="text-[11px] text-slate-400">{subtitle}</span>
        ) : (
          <span />
        )}

        {/* Mini SVG Sparkline */}
        <div className="w-20 h-6 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
          <svg viewBox="0 0 80 24" className="w-full h-full overflow-visible">
            <path
              d={
                tone === "red"
                  ? "M 0 18 Q 20 22, 40 14 T 80 8"
                  : tone === "green" || tone === "teal"
                  ? "M 0 20 Q 25 10, 50 18 T 80 6"
                  : tone === "purple"
                  ? "M 0 16 Q 20 18, 40 8 T 80 12"
                  : "M 0 20 Q 20 22, 45 12 T 80 6"
              }
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
