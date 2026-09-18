"use client";

import React from "react";
import Link from "next/link";
import { Incident } from "@/types";
import { ShieldAlert, Sparkles, ArrowRight, CheckCircle2, Clock3 } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";

interface IncidentOverviewProps {
  incidents: Incident[];
  onRefresh?: () => void;
}

export function IncidentOverview({ incidents, onRefresh }: IncidentOverviewProps) {
  const recent = incidents.slice(0, 4);

  return (
    <div className="panel flex h-full flex-col p-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Active Anomalies & Triage</h2>
            <p className="text-[11px] text-slate-500">Isolation Forest & RAG diagnostics</p>
          </div>
        </div>

        <Link
          href="/incidents"
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Incident List */}
      <div className="mt-4 flex-1 space-y-3 overflow-y-auto max-h-[340px]">
        {recent.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-400/60" />
            <p className="mt-2 text-xs font-bold text-slate-300">All Systems Nominal</p>
            <p className="text-[10px] text-slate-500">No open anomalies detected in telemetry window</p>
          </div>
        ) : (
          recent.map((inc) => {
            const scorePct = Math.round(inc.anomaly_score * 100);
            const isCritical = scorePct >= 80;
            return (
              <div
                key={inc.id}
                className="group relative rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 transition hover:border-slate-700 hover:bg-slate-900/90"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                          inc.status === "OPEN"
                            ? "status-open"
                            : inc.status === "INVESTIGATING"
                            ? "status-investigating"
                            : "status-resolved"
                        }`}
                      >
                        {inc.status}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-cyan-400">
                        [{inc.service_id}]
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {formatTimeAgo(inc.created_at)}
                      </span>
                    </div>

                    <h3 className="mt-1.5 truncate text-xs font-bold text-slate-200">
                      {inc.title || inc.error_type}
                    </h3>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`font-mono text-sm font-extrabold ${
                        isCritical ? "text-rose-400" : "text-amber-400"
                      }`}
                    >
                      {scorePct}%
                    </span>
                    <span className="block text-[9px] uppercase tracking-wider text-slate-500">
                      Outlier
                    </span>
                  </div>
                </div>

                {inc.ai_root_cause && (
                  <div className="mt-2.5 rounded-lg border border-blue-500/10 bg-blue-500/5 p-2">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-blue-400">
                      <Sparkles className="h-3 w-3" /> AI Doctor Synthesis
                    </div>
                    <p className="mt-1 line-clamp-1 text-[10px] text-slate-300">
                      {inc.ai_root_cause.replace(/\*\*/g, "")}
                    </p>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-end">
                  <Link
                    href={`/incidents/${inc.id}`}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-400 transition hover:text-blue-300"
                  >
                    View diagnostic patch <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
export default IncidentOverview;
