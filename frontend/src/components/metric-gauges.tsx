"use client";

import React from "react";
import { Activity, AlertTriangle, Clock, Server, Zap, ShieldCheck } from "lucide-react";
import { SystemStats } from "@/lib/api-client";

interface MetricGaugesProps {
  stats: SystemStats;
  isConnected: boolean;
}

export function MetricGauges({ stats, isConnected }: MetricGaugesProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Ingestion Throughput */}
      <div className="bg-surface/80 backdrop-blur border border-border rounded-xl p-4 transition-all duration-200 hover:border-primary-500/50 shadow-lg relative overflow-hidden group">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400 opacity-80" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Ingestion Rate
          </span>
          <div className="p-2 rounded-lg bg-blue-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
            <Activity className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-slate-100">
            {stats.ingestion_rate_per_sec}
          </span>
          <span className="text-xs text-slate-400">events/sec</span>
        </div>
        <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
          <span className="text-slate-300 font-mono font-medium">{stats.total_logs_ingested.toLocaleString()}</span>
          <span>total logs ingested</span>
        </div>
      </div>

      {/* 2. P95 Latency */}
      <div className="bg-surface/80 backdrop-blur border border-border rounded-xl p-4 transition-all duration-200 hover:border-purple-500/50 shadow-lg relative overflow-hidden group">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-400 opacity-80" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            P95 Latency
          </span>
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className={`text-2xl font-bold font-mono ${
            stats.p95_latency_ms > 500 ? "text-rose-400" : stats.p95_latency_ms > 200 ? "text-amber-400" : "text-slate-100"
          }`}>
            {stats.p95_latency_ms}
          </span>
          <span className="text-xs text-slate-400">ms</span>
        </div>
        <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
          {stats.p95_latency_ms < 100 ? (
            <span className="text-emerald-400 flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" /> High Performance
            </span>
          ) : (
            <span className="text-amber-400 font-medium">Degraded Latency</span>
          )}
        </div>
      </div>

      {/* 3. Error Rate */}
      <div className="bg-surface/80 backdrop-blur border border-border rounded-xl p-4 transition-all duration-200 hover:border-rose-500/50 shadow-lg relative overflow-hidden group">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-rose-500 opacity-80" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Error Ratio
          </span>
          <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className={`text-2xl font-bold font-mono ${
            stats.error_rate_percent > 5 ? "text-rose-400 font-extrabold" : "text-slate-100"
          }`}>
            {stats.error_rate_percent}%
          </span>
          <span className="text-xs text-slate-400">of window</span>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          {stats.error_rate_percent === 0 ? (
            <span className="text-emerald-400 font-medium">0.0% Clean Stream</span>
          ) : (
            <span className="text-rose-400 font-medium">Error Spikes Detected</span>
          )}
        </div>
      </div>

      {/* 4. Active Anomalies & Cluster State */}
      <div className="bg-surface/80 backdrop-blur border border-border rounded-xl p-4 transition-all duration-200 hover:border-emerald-500/50 shadow-lg relative overflow-hidden group">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-cyan-500 opacity-80" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Active Incidents
          </span>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
            <Server className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className={`text-2xl font-bold font-mono ${
            stats.open_incidents_count > 0 ? "text-rose-400 animate-pulse" : "text-emerald-400"
          }`}>
            {stats.open_incidents_count}
          </span>
          <span className="text-xs text-slate-400">open</span>
        </div>
        <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
          <span>{stats.active_services_count} Microservices</span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400 animate-ping" : "bg-rose-500"}`} />
            <span className={isConnected ? "text-emerald-400" : "text-rose-400"}>
              {isConnected ? "WS Live" : "Offline"}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
