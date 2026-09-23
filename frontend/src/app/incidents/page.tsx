"use client";

import React, { useCallback } from "react";
import {
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  Layers,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { useIncidents } from "@/hooks/use-incidents";
import { useWebSocket, type AnomalyAlertEvent } from "@/hooks/use-websocket";
import { IncidentTable } from "@/components/incidents/IncidentTable";

export default function IncidentsPage() {
  const { incidents, loading, refresh } = useIncidents(5000);

  const handleRealtimeAlert = useCallback(
    (alert: AnomalyAlertEvent) => {
      console.log("[AuraTrace] Realtime crash alert:", alert);
      void refresh();
    },
    [refresh]
  );

  const { isConnected } = useWebSocket(handleRealtimeAlert);

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
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
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

              <span
                className={`ml-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  isConnected
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                {isConnected ? "Live" : "Offline"}
              </span>
            </div>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 font-heading md:text-3xl">
              Crashes
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 font-sans">
              Live crash detection, AI root-cause analysis, and actionable code fixes
            </p>
          </div>

          <button
            type="button"
            onClick={() => refresh()}
            disabled={loading}
            className="button-secondary active:scale-95 transition-all cursor-pointer font-heading flex items-center gap-2"
            title="Refresh crashes list"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                loading ? "animate-spin text-red-600" : "text-slate-500"
              }`}
            />
            <span>{loading ? "Refreshing..." : "Refresh Crashes"}</span>
          </button>
        </div>

        {/* 4 Clean Metric Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="panel border-rose-200 bg-rose-50/40 p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 font-heading">
                Active Crashes
              </span>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-rose-600">
              {activeCount}
            </p>
          </div>

          <div className="panel p-5 bg-white border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-heading">
                Total Crashes
              </span>
              <Layers className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-slate-900">
              {incidents.length}
            </p>
          </div>

          <div className="panel border-purple-200 bg-purple-50/40 p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 font-heading">
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
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 font-heading">
                Resolved
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-emerald-600">
              {resolvedCount}
            </p>
          </div>
        </div>

        {/* Crash Cards Feed */}
        <IncidentTable
          incidents={incidents}
          onRefresh={refresh}
        />
      </div>
    </AppShell>
  );
}
