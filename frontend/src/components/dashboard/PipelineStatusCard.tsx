"use client";

import React from "react";
import { Activity, ArrowRight, CheckCircle2, Cpu, Database, Sparkles } from "lucide-react";

interface PipelineStatusCardProps {
  isOnline?: boolean;
}

export function PipelineStatusCard({ isOnline = true }: PipelineStatusCardProps) {
  return (
    <div className="panel p-5 bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left Info */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-[#dc2626] border border-red-100 shrink-0">
            <Activity className="h-5 w-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-heading font-extrabold text-base text-slate-900 tracking-tight">
                Diagnostics Engine
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 font-heading">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Online
              </span>
            </div>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Continuous streaming anomaly evaluation and RAG diagnosis
            </p>
          </div>
        </div>

        {/* Middle: 3 Connected Pipeline Stages */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto py-1">
          {/* Stage 1: Redis Stream */}
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2 shrink-0">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <Database className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs font-bold text-slate-800 font-heading">
              Redis Stream
            </span>
          </div>

          <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />

          {/* Stage 2: pgvector */}
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2 shrink-0">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <Cpu className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs font-bold text-slate-800 font-heading">
              pgvector
            </span>
          </div>

          <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />

          {/* Stage 3: AI Doctor / RAG */}
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2 shrink-0">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-bold text-slate-800 font-heading">
              AI Doctor / RAG
            </span>
          </div>
        </div>

        {/* Right Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3.5 py-1 text-xs font-semibold text-slate-700 font-heading">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Pipeline Live</span>
          </div>
        </div>
      </div>
    </div>
  );
}
