"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShieldAlert, ArrowRight, Sparkles, RefreshCw, Layers } from "lucide-react";
import { MetricGauges } from "@/components/metric-gauges";
import { LiveLogStream } from "@/components/live-log-stream";
import { AnomalyAlertBanner } from "@/components/anomaly-alert-banner";
import { useWebSocket, AnomalyAlertEvent } from "@/hooks/use-websocket";
import { useIncidents } from "@/hooks/use-incidents";
import { formatTimeAgo } from "@/lib/utils";

export default function OverviewDashboardPage() {
  const [currentAlert, setCurrentAlert] = useState<AnomalyAlertEvent | null>(null);

  // Hook for live WebSocket log streaming & anomaly alerts
  const { isConnected, logs, clearLogs } = useWebSocket((alert) => {
    setCurrentAlert(alert);
    refresh(); // Refresh incident table
  });

  // Hook for periodic REST stats and incident updates
  const { incidents, stats, loading, refresh } = useIncidents(4000);

  const recentIncidents = incidents.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Real-Time Anomaly Alert Banner (Pulsing neon) */}
      <AnomalyAlertBanner
        alert={currentAlert}
        onDismiss={() => setCurrentAlert(null)}
      />

      {/* Top Telemetry Metric Gauges */}
      <MetricGauges stats={stats} isConnected={isConnected} />

      {/* Main Grid: Live Log Stream + Recent Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Live Streaming Terminal (7 cols) */}
        <div className="lg:col-span-8">
          <LiveLogStream
            logs={logs}
            onClear={clearLogs}
            isConnected={isConnected}
          />
        </div>

        {/* Right Col: Active & Recent Incidents (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-surface/90 border border-border rounded-xl shadow-xl flex flex-col h-[520px] overflow-hidden">
            {/* Header */}
            <div className="bg-surface-raised/80 border-b border-border px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-rose-500/10 text-rose-400">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Recent Incident Reports
                </h3>
              </div>
              <button
                onClick={() => refresh()}
                className="p-1.5 rounded-lg border border-border bg-surface text-slate-400 hover:text-slate-200 transition-colors"
                title="Refresh incidents"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-slate-800/40">
              {recentIncidents.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12 text-center">
                  <Layers className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm font-medium">No Incidents Detected</p>
                  <p className="text-xs text-slate-600 mt-1 max-w-[200px]">
                    System is healthy. All microservice telemetry within baseline thresholds.
                  </p>
                </div>
              ) : (
                recentIncidents.map((inc) => {
                  const scorePct = Math.round(inc.anomaly_score * 100);
                  const isHighSev = scorePct >= 80;

                  return (
                    <div
                      key={inc.id}
                      className="pt-2.5 first:pt-0 group transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                                inc.status === "OPEN"
                                  ? "bg-rose-950 text-rose-400 border border-rose-800/60"
                                  : inc.status === "INVESTIGATING"
                                  ? "bg-amber-950 text-amber-400 border border-amber-800/60"
                                  : "bg-emerald-950 text-emerald-400 border border-emerald-800/60"
                              }`}
                            >
                              {inc.status}
                            </span>
                            <span className="text-xs font-semibold text-slate-200 truncate max-w-[170px]">
                              {inc.error_type || "System Anomaly"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono mt-1">
                            [{inc.service_id}] • {formatTimeAgo(inc.created_at)}
                          </p>
                        </div>

                        {/* Anomaly Score */}
                        <div className="text-right shrink-0">
                          <span
                            className={`text-xs font-mono font-bold ${
                              isHighSev ? "text-rose-400" : "text-amber-400"
                            }`}
                          >
                            {scorePct}%
                          </span>
                          <span className="text-[10px] text-slate-500 block">score</span>
                        </div>
                      </div>

                      {/* AI Root cause brief */}
                      {inc.ai_root_cause && (
                        <p className="text-xs text-slate-300/80 line-clamp-2 mt-2 bg-background/60 p-2 rounded border border-border/50 text-[11px]">
                          {inc.ai_root_cause.replace(/\*\*/g, "")}
                        </p>
                      )}

                      {/* CTA link */}
                      <div className="mt-2 flex justify-end">
                        <Link
                          href={`/incidents/${inc.id}`}
                          className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-medium group-hover:translate-x-0.5 transition-transform"
                        >
                          <Sparkles className="w-3 h-3" />
                          View AI Diagnostics
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer View All */}
            <div className="bg-surface-raised/40 border-t border-border p-2.5 text-center">
              <Link
                href="/incidents"
                className="text-xs text-slate-400 hover:text-white font-medium flex items-center justify-center gap-1"
              >
                View all incidents & history
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
