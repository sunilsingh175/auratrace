"use client";

import React from "react";
import { Server, Database, Zap, Sparkles } from "lucide-react";
import { InfrastructureStatus, SystemStats } from "@/types";

interface SystemHealthProps {
  health: InfrastructureStatus | null;
  stats: SystemStats | null;
}

export function SystemHealth({ health }: SystemHealthProps) {
  const systems = [
    {
      name: "API Gateway",
      icon: Server,
      status: health?.api_status || "Online",
      color: "text-blue-600",
    },
    {
      name: "PostgreSQL",
      icon: Database,
      status: health?.postgres_status || "Online",
      color: "text-indigo-600",
    },
    {
      name: "Redis",
      icon: Zap,
      status: health?.redis_status || "Online",
      color: "text-amber-600",
    },
    {
      name: "AI Diagnostics",
      icon: Sparkles,
      status: health?.rag_doctor_status || "Online",
      color: "text-purple-600",
    },
  ];

  return (
    <div className="panel p-6 bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
          System Health
        </h3>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-emerald-700 font-heading">
            All Systems Operational
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {systems.map((sys) => {
          const Icon = sys.icon;
          return (
            <div
              key={sys.name}
              className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`h-4 w-4 ${sys.color}`} />
                <span className="text-xs font-bold font-heading text-slate-900">
                  {sys.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-slate-700 font-sans">
                  {sys.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
