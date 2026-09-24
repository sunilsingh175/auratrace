"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Server, Sparkles, Terminal } from "lucide-react";
import { Incident } from "@/types";
import { SeverityBadge } from "@/components/incidents/SeverityBadge";

interface ActiveAnomaliesPanelProps {
  incidents: Incident[];
}

function formatPercent(value: unknown): string {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return "N/A";
  if (num <= 1) return `${Math.round(num * 100)}%`;
  return `${Math.round(num)}%`;
}

export function ActiveAnomaliesPanel({ incidents }: ActiveAnomaliesPanelProps) {
  return (
    <div className="panel p-6 bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
        <div>
          <h2 className="font-heading font-extrabold text-lg text-slate-900 tracking-tight">
            Recent Crashes
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Automatic exception capture, stack traces &amp; AI triage
          </p>
        </div>
        <Link
          href="/incidents"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#dc2626] hover:text-[#b91c1c] transition font-heading"
        >
          <span>View all crashes</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Incident Rows */}
      {incidents.length > 0 ? (
        <div className="space-y-3">
          {incidents.slice(0, 5).map((incident) => {
            const score = incident.anomaly_score;
            const serviceName = incident.service_id || "Unknown application";
            const incidentTitle =
              incident.title ||
              incident.error_type ||
              `Unhandled Exception in ${serviceName}`;

            return (
              <div
                key={incident.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition-all"
              >
                {/* Left: Severity Badge, Service, Title */}
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <div className="shrink-0">
                    <SeverityBadge severity={incident.severity || "high"} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 font-heading truncate">
                        {incidentTitle}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 font-sans">
                      <div className="flex items-center gap-1">
                        <Server className="h-3 w-3 text-slate-400" />
                        <span className="font-semibold text-slate-700">{serviceName}</span>
                      </div>
                      {incident.error_type && (
                        <div className="hidden md:flex items-center gap-1 text-slate-400 font-mono text-[10px]">
                          <Terminal className="h-3 w-3" />
                          <span className="truncate max-w-[240px]">{incident.error_type}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Outlier Score & Action CTA */}
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                  {typeof score === "number" && score > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-rose-600">
                        {formatPercent(score)}
                      </span>
                      <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[9px] font-bold text-rose-700 font-heading">
                        Outlier
                      </span>
                    </div>
                  )}

                  <Link
                    href={`/incidents/${incident.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white px-3.5 py-1.5 text-xs font-bold font-heading shadow-xs transition cursor-pointer"
                  >
                    <span>View Crash &amp; Fix</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center rounded-xl border border-dashed border-slate-200">
          <ShieldCheck className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-700 font-heading">
            No Crashes Found
          </p>
          <p className="text-[11px] text-slate-400 font-sans mt-0.5">
            No crashes match the current filters.
          </p>
        </div>
      )}
    </div>
  );
}

export default ActiveAnomaliesPanel;
