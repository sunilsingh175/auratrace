"use client";

import React from "react";
import { Activity, AlertTriangle, Clock3, Server, ShieldCheck } from "lucide-react";
import { SystemStats } from "@/lib/api-client";

export function MetricGauges({ stats, isConnected }: { stats: SystemStats; isConnected: boolean }) {
  const cards = [
    { label: "Ingestion rate", value: stats.ingestion_rate_per_sec, unit: "events/sec", sub: `${stats.total_logs_ingested.toLocaleString()} total logs ingested`, icon: Activity, tone: "text-cyan-400", bar: "bg-cyan-500" },
    { label: "P95 latency", value: stats.p95_latency_ms, unit: "ms", sub: stats.p95_latency_ms < 300 ? "High performance" : "Elevated latency", icon: Clock3, tone: "text-violet-400", bar: "bg-violet-500" },
    { label: "Error ratio", value: `${stats.error_rate_percent.toFixed(1)}%`, unit: "of window", sub: stats.error_rate_percent === 0 ? "Clean stream" : "Errors detected", icon: AlertTriangle, tone: "text-rose-400", bar: "bg-rose-500" },
    { label: "Active incidents", value: stats.open_incidents_count, unit: "open", sub: `${stats.active_services_count} active services`, icon: Server, tone: "text-emerald-400", bar: "bg-emerald-500" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="panel relative overflow-hidden p-4 transition hover:border-slate-600">
            <div className={`absolute inset-x-0 top-0 h-0.5 ${card.bar}`} />
            <div className="flex items-center justify-between">
              <p className="label">{card.label}</p>
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 ${card.tone}`}><Icon className="h-4.5 w-4.5" /></span>
            </div>
            <div className="mt-4 flex items-end gap-2">
              <span className="font-mono text-2xl font-bold tracking-tight text-white">{card.value}</span>
              <span className="pb-0.5 text-[11px] text-slate-500">{card.unit}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-500">
              <span>{card.sub}</span>
              {card.label === "Active incidents" && <span className={`inline-flex items-center gap-1 ${isConnected ? "text-emerald-400" : "text-rose-400"}`}><span className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-emerald-400" : "bg-rose-400"}`} />{isConnected ? "WS Live" : "Offline"}</span>}
              {card.label === "P95 latency" && <span className="inline-flex items-center gap-1 text-emerald-400"><ShieldCheck className="h-3 w-3" /> Stable</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
