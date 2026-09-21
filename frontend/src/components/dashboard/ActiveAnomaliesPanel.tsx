"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, ShieldCheck, Server } from "lucide-react";
import { Incident } from "@/types";

interface ActiveAnomaliesPanelProps {
  incidents: Incident[];
}

function formatPercent(value: unknown): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return "80%";
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
            Active Anomalies & Triage
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Isolation Forest & RAG diagnostics
          </p>
        </div>
        <Link
          href="/incidents"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#dc2626] hover:text-[#b91c1c] transition font-heading"
        >
          <span>View all</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Incident Rows */}
      {incidents.length > 0 ? (
        <div className="space-y-3">
          {incidents.slice(0, 5).map((incident) => {
            const score = (incident as any).anomaly_score ?? (incident as any).score ?? 0.8;
            const serviceName = incident.service_id || "hdfs-namenode";
            const incidentTitle =
              incident.title ||
              incident.error_type ||
              `SystemAnomaly in ${serviceName}`;

            return (
              <div
                key={incident.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition-all"
              >
                {/* Left: Status Badge, Service, Title */}
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 font-heading uppercase tracking-wider shrink-0">
                    {incident.status || "OPEN"}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 font-heading truncate">
                        {incidentTitle}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-sans">
                      <Server className="h-3 w-3 text-slate-400" />
                      <span className="font-semibold text-slate-600">{serviceName}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Anomaly Score, Outlier Badge, Action link */}
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 font-heading">
                      {formatPercent(score)}
                    </span>
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 font-heading">
                      Outlier
                    </span>
                  </div>

                  <Link
                    href={`/incidents/${incident.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 hover:border-slate-300 transition shadow-sm font-heading"
                  >
                    <span>View diagnostic patch</span>
                    <ArrowRight className="h-3 w-3 text-[#dc2626]" />
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
            No active anomalies detected
          </p>
          <p className="text-[11px] text-slate-400 font-sans mt-0.5">
            All connected microservices are operating within nominal parameters.
          </p>
        </div>
      )}
    </div>
  );
}
