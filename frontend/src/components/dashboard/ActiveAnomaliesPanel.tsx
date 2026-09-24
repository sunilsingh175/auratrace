"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Incident } from "@/types";
import { SeverityBadge } from "@/components/incidents/SeverityBadge";
import { formatTimeAgo } from "@/lib/utils";

interface ActiveAnomaliesPanelProps {
  incidents: Incident[];
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
            Real-time exception capture and AI diagnostic fixes
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
        <div className="divide-y divide-slate-100">
          {incidents.slice(0, 6).map((incident) => {
            const serviceName = incident.service_id || "Unknown application";
            let incidentTitle =
              incident.title ||
              incident.error_type ||
              `Unhandled Exception in ${serviceName}`;
            if (incidentTitle.endsWith(` in ${serviceName}`)) {
              incidentTitle = incidentTitle.replace(` in ${serviceName}`, "").trim();
            }

            return (
              <div
                key={incident.id}
                className="flex items-center justify-between py-3.5 px-2 hover:bg-slate-50/70 rounded-xl transition-colors group"
              >
                {/* Left: Severity Badge, Title, Service, Timestamp */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                  <div className="shrink-0 pt-0.5 sm:pt-0">
                    <SeverityBadge severity={incident.severity || "high"} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/incidents/${incident.id}`}
                        className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-red-600 transition font-heading truncate"
                      >
                        {incidentTitle}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-sans">
                      <span className="font-medium text-slate-700">{serviceName}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-400">{formatTimeAgo(incident.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Right: View Action */}
                <div className="shrink-0 ml-3">
                  <Link
                    href={`/incidents/${incident.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-red-600 group-hover:translate-x-0.5 transition-all font-heading py-1.5 px-3 rounded-lg hover:bg-red-50/50"
                  >
                    <span>View</span>
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
            No Crashes Recorded
          </p>
          <p className="text-[11px] text-slate-400 font-sans mt-0.5">
            Application health is optimal. No active crashes detected.
          </p>
        </div>
      )}
    </div>
  );
}

export default ActiveAnomaliesPanel;
