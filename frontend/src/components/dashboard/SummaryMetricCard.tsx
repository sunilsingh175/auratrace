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
}

export function SummaryMetricCard({
  title,
  value,
  unit,
  description,
  badge = "Live API",
  icon: Icon,
  tone = "slate",
}: SummaryMetricCardProps) {
  const toneClasses = {
    red: "bg-red-50 text-[#dc2626] border-red-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
  };

  return (
    <div className="panel min-h-[156px] p-5 flex flex-col justify-between hover:border-slate-200 hover:shadow-md transition-all">
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

      {/* Bottom row: Supporting description */}
      <p className="text-xs text-slate-500 font-sans mt-3 border-t border-slate-50 pt-3">
        {description}
      </p>
    </div>
  );
}
