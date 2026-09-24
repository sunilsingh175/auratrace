"use client";

import React, { useCallback } from "react";
import {
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { useIncidents } from "@/hooks/use-incidents";
import { useWebSocket, type AnomalyAlertEvent } from "@/hooks/use-websocket";
import { IncidentTable } from "@/components/incidents/IncidentTable";

export default function IncidentsPage() {
  const { incidents, loading, refresh } = useIncidents(5000);

  const handleRealtimeAlert = useCallback(
    (alert: AnomalyAlertEvent) => {
      console.log("[AutoTrace Crashes] Realtime crash alert:", alert);
      void refresh();
    },
    [refresh]
  );

  useWebSocket(handleRealtimeAlert);

  const activeCount = incidents.filter(
    (i) => i.status === "OPEN" || i.status === "INVESTIGATING"
  ).length;
  const diagnosedCount = incidents.filter(
    (i) => Boolean((i as any).is_diagnosed || i.ai_root_cause || (i as any).suggested_patch)
  ).length;
  const resolvedCount = incidents.filter(
    (i) => i.status === "RESOLVED"
  ).length;

  return (
    <AppShell hideHeaderTitle>
      <div className="page-container max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
                Crash Triage
              </span>
            </div>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 font-heading md:text-3xl">
              Crashes
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 font-sans">
              Real-time exception monitoring, anomaly scores &amp; automated AI fixes
            </p>
          </div>

          <button
            type="button"
            onClick={() => refresh()}
            disabled={loading}
            className="button-secondary active:scale-95 transition-all cursor-pointer font-heading flex items-center gap-2"
            title="Refresh crashes"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                loading ? "animate-spin text-red-600" : "text-slate-500"
              }`}
            />
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>

        {/* 3 Clean Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="panel border-rose-200 bg-rose-50/40 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-700 font-heading">
                Active Crashes
              </span>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-rose-600">
              {activeCount}
            </p>
          </div>

          <div className="panel border-purple-200 bg-purple-50/40 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700 font-heading">
                Diagnoses Ready
              </span>
              <Sparkles className="h-4 w-4 text-purple-500" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-purple-700">
              {diagnosedCount}
            </p>
          </div>

          <div className="panel border-emerald-200 bg-emerald-50/40 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 font-heading">
                Resolved
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-emerald-600">
              {resolvedCount}
            </p>
          </div>
        </div>

        {/* Crash Cards List */}
        <IncidentTable
          incidents={incidents}
          onRefresh={refresh}
        />
      </div>
    </AppShell>
  );
}
