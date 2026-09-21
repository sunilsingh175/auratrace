"use client";

import React, { useCallback } from "react";
import {
  ShieldAlert,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock3,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { useIncidents } from "@/hooks/use-incidents";
import { useWebSocket, type AnomalyAlertEvent } from "@/hooks/use-websocket";
import { IncidentTable } from "@/components/incidents/IncidentTable";

export default function IncidentsPage() {
  const { incidents, loading, refresh } = useIncidents(5000);

  const handleRealtimeAlert = useCallback(
    (alert: AnomalyAlertEvent) => {
      console.log("[Trace] Realtime incident event:", alert);

      // Refresh the incident list immediately when ML/RAG
      // publishes a realtime event.
      void refresh();
    },
    [refresh]
  );

  const { isConnected } = useWebSocket(handleRealtimeAlert);

  const openCount = incidents.filter((i) => i.status === "OPEN").length;
  const investigatingCount = incidents.filter(
    (i) => i.status === "INVESTIGATING"
  ).length;
  const resolvedCount = incidents.filter(
    (i) => i.status === "RESOLVED"
  ).length;

  return (
    <AppShell hideHeaderTitle>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <ShieldAlert className="h-4 w-4" />
              </span>

              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
                Autonomous Incident Triage
              </span>

              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  isConnected
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                {isConnected ? "Live" : "Offline"}
              </span>
            </div>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 font-heading md:text-3xl">
              Incident Diagnostics Hub
            </h1>
          </div>

          <button
            type="button"
            onClick={() => refresh()}
            disabled={loading}
            className="button-secondary active:scale-95 transition-all cursor-pointer font-heading flex items-center gap-2"
            title="Refresh incidents and system metrics"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                loading ? "animate-spin text-red-600" : "text-slate-500"
              }`}
            />
            <span>{loading ? "Refreshing..." : "Refresh Incidents"}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="panel p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-heading">Total Incidents</span>
              <ShieldAlert className="h-4 w-4 text-slate-400" />
            </div>

            <p className="mt-3 font-mono text-2xl font-bold text-slate-900">
              {incidents.length}
            </p>
          </div>

          <div className="panel border-rose-200 bg-rose-50/50 p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 font-heading">
                Open Anomalies
              </span>

              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>

            <p className="mt-3 font-mono text-2xl font-bold text-rose-600">
              {openCount}
            </p>
          </div>

          <div className="panel border-amber-200 bg-amber-50/50 p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 font-heading">
                Investigating
              </span>

              <Clock3 className="h-4 w-4 text-amber-500" />
            </div>

            <p className="mt-3 font-mono text-2xl font-bold text-amber-600">
              {investigatingCount}
            </p>
          </div>

          <div className="panel border-emerald-200 bg-emerald-50/50 p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 font-heading">
                Resolved
              </span>

              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>

            <p className="mt-3 font-mono text-2xl font-bold text-emerald-600">
              {resolvedCount}
            </p>
          </div>
        </div>

        <IncidentTable
          incidents={incidents}
          onRefresh={refresh}
        />
      </div>
    </AppShell>
  );
}
