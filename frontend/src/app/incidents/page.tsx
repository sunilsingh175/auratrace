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
      console.log("[AuraTrace] Realtime incident event:", alert);

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
    <AppShell
      title="Incident Intelligence Hub"
      subtitle="Automated anomaly diagnostics, pgvector RAG matching and AI triage"
    >
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
                  <ShieldAlert className="h-4 w-4" />
                </span>

                <span className="label">Autonomous Incident Triage</span>

                <span
                  className={`ml-2 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    isConnected
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-rose-500/10 text-rose-400"
                  }`}
                >
                  {isConnected ? "Live" : "Offline"}
                </span>
              </div>

              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
                Incident Diagnostics Hub
              </h1>
            </div>

            <button
              type="button"
              onClick={() => refresh()}
              disabled={loading}
              className="button-secondary"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  loading ? "animate-spin" : ""
                }`}
              />
              <span>Refresh Incidents</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="panel p-5">
              <div className="flex items-center justify-between">
                <span className="label">Total Incidents</span>
                <ShieldAlert className="h-4 w-4 text-blue-400" />
              </div>

              <p className="mt-3 font-mono text-2xl font-extrabold text-white">
                {incidents.length}
              </p>
            </div>

            <div className="panel border-rose-500/30 bg-rose-500/5 p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300">
                  Open Anomalies
                </span>

                <AlertTriangle className="h-4 w-4 text-rose-400" />
              </div>

              <p className="mt-3 font-mono text-2xl font-extrabold text-rose-400">
                {openCount}
              </p>
            </div>

            <div className="panel border-amber-500/30 bg-amber-500/5 p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                  Investigating
                </span>

                <Clock3 className="h-4 w-4 text-amber-400" />
              </div>

              <p className="mt-3 font-mono text-2xl font-extrabold text-amber-300">
                {investigatingCount}
              </p>
            </div>

            <div className="panel border-emerald-500/30 bg-emerald-500/5 p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                  Resolved
                </span>

                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              </div>

              <p className="mt-3 font-mono text-2xl font-extrabold text-emerald-400">
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
