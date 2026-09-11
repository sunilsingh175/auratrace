"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Layers, RefreshCw, ShieldAlert, Sparkles } from "lucide-react";
import { MetricGauges } from "@/components/metric-gauges";
import { LiveLogStream } from "@/components/live-log-stream";
import { AnomalyAlertBanner } from "@/components/anomaly-alert-banner";
import { AnomalyAlertEvent, useWebSocket } from "@/hooks/use-websocket";
import { useIncidents } from "@/hooks/use-incidents";
import { formatTimeAgo } from "@/lib/utils";

export default function OverviewDashboardPage() {
  const [currentAlert, setCurrentAlert] = useState<AnomalyAlertEvent | null>(null);
  const { isConnected, logs, clearLogs } = useWebSocket((alert) => {
    setCurrentAlert(alert);
    refresh();
  });
  const { incidents, stats, refresh } = useIncidents(5000);
  const recentIncidents = incidents.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="label">Operations Center</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">Observability Overview</h1>
          </div>
          <div className="hidden text-right sm:block">
            <p className="muted-text">Live monitoring</p>
            <p className="mt-1 text-xs font-medium text-slate-300">Telemetry, anomalies and AI diagnostics</p>
          </div>
        </div>
      </div>

      <AnomalyAlertBanner alert={currentAlert} onDismiss={() => setCurrentAlert(null)} />

      <MetricGauges stats={stats} isConnected={isConnected} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <LiveLogStream logs={logs} onClear={clearLogs} isConnected={isConnected} />
        </div>

        <section className="panel flex h-[520px] min-h-0 flex-col overflow-hidden xl:col-span-4">
          <div className="panel-header">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
                <ShieldAlert className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-white">Recent Incident Reports</h2>
                <p className="mt-0.5 text-[10px] text-slate-500">Latest events from PostgreSQL</p>
              </div>
            </div>
            <button onClick={() => refresh()} title="Refresh incidents" className="button-secondary !px-2.5 !py-2">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {recentIncidents.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-slate-500">
                  <Layers className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-semibold text-slate-300">No incidents detected</p>
                <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">The system has no recent anomaly records to display.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentIncidents.map((inc) => {
                  const scorePct = Math.round(inc.anomaly_score * 100);
                  const high = scorePct >= 80;
                  const statusClass = inc.status === "OPEN" ? "status-open" : inc.status === "INVESTIGATING" ? "status-investigating" : "status-resolved";

                  return (
                    <article key={inc.id} className="rounded-lg border border-slate-800 bg-slate-800/35 p-3 transition hover:border-slate-700 hover:bg-slate-800/55">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${statusClass}`}>{inc.status}</span>
                            <span className="truncate text-xs font-semibold text-slate-200">{inc.error_type || "System Anomaly"}</span>
                          </div>
                          <p className="mt-1 text-[10px] font-mono text-slate-500">[{inc.service_id}] · {formatTimeAgo(inc.created_at)}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className={`font-mono text-sm font-bold ${high ? "text-rose-400" : "text-amber-400"}`}>{scorePct}%</span>
                          <span className="block text-[9px] text-slate-600">score</span>
                        </div>
                      </div>

                      {inc.ai_root_cause && (
                        <p className="mt-2 rounded-md border border-slate-700/80 bg-slate-950/60 px-2.5 py-2 text-[10px] leading-4 text-slate-400 line-clamp-2">
                          {inc.ai_root_cause.replace(/\*\*/g, "")}
                        </p>
                      )}

                      <Link href={`/incidents/${inc.id}`} className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold text-blue-400 transition hover:text-blue-300">
                        <Sparkles className="h-3 w-3" /> View diagnostics <ArrowRight className="h-3 w-3" />
                      </Link>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-slate-800 bg-slate-800/30 p-2.5 text-center">
            <Link href="/incidents" className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-white">
              View incident history <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
