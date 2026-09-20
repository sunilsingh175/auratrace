"use client";

import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Cpu,
  Brain,
  Layers,
  FileCode,
} from "lucide-react";
import { Incident } from "@/types";

interface AIAnalysisProps {
  incident: Incident;
  onRegenerate?: () => void;
  onResolve?: () => void;
  isRegenerating?: boolean;
}

export function AIAnalysis({
  incident,
  onRegenerate,
  onResolve,
  isRegenerating = false,
}: AIAnalysisProps) {
  const [copiedFix, setCopiedFix] = useState(false);

  const handleCopyFix = () => {
    if (!incident.ai_recommended_fix) return;
    navigator.clipboard.writeText(incident.ai_recommended_fix);
    setCopiedFix(true);
    setTimeout(() => setCopiedFix(false), 2000);
  };

  return (
    <div className="panel overflow-hidden border-blue-500/30 shadow-2xl shadow-blue-500/5">
      {/* AI Doctor Header */}
      <div className="flex flex-col gap-3 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/20 p-5 border-b border-blue-500/20 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30">
            <Sparkles className="h-5 w-5 text-cyan-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white">
                RAG AI Diagnostics Doctor
              </h2>
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[9px] font-bold text-cyan-300">
                Gemini 2.5 Flash RAG
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Autonomous root cause synthesis retrieved via PostgreSQL + pgvector
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="button-secondary text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
              <span>{isRegenerating ? "Synthesizing..." : "Regenerate Diagnosis"}</span>
            </button>
          )}

          {onResolve && incident.status !== "RESOLVED" && (
            <button
              type="button"
              onClick={onResolve}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:from-emerald-500 hover:to-teal-500"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Mark Resolved</span>
            </button>
          )}
        </div>
      </div>

      {/* Diagnosis Content */}
      <div className="p-6 space-y-6">
        {/* Root Cause Section */}
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
            <Brain className="h-4 w-4" />
            <span>Automated Root Cause Diagnosis</span>
          </div>
          <div className="mt-2.5 rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-xs leading-relaxed text-slate-200">
            {incident.ai_root_cause ? (
              <p className="whitespace-pre-line">{incident.ai_root_cause}</p>
            ) : (
              <p className="text-slate-500 italic">No root cause generated yet.</p>
            )}
          </div>
        </div>

        {/* Recommended Solution Steps */}
        {incident.ai_recommended_fix && (
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Recommended Engineering Fix</span>
              </div>
              <button
                type="button"
                onClick={handleCopyFix}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-white transition"
              >
                {copiedFix ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copiedFix ? "Copied" : "Copy Steps"}</span>
              </button>
            </div>
            <div className="mt-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs leading-relaxed text-slate-200 whitespace-pre-line font-mono">
              {incident.ai_recommended_fix}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default AIAnalysis;
