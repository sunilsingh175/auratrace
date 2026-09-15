"use client";

import React, { useState, useEffect } from "react";
import {
  Server,
  Activity,
  ShieldAlert,
  Cpu,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Globe
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

interface ClusterStats {
  events_per_sec: number;
  total_logs_ingested: number;
  p95_latency_ms: number;
  error_ratio: number;
  active_services_count: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<ClusterStats>({
    events_per_sec: 142,
    total_logs_ingested: 18450,
    p95_latency_ms: 18,
    error_ratio: 0.02,
    active_services_count: 3,
  });
  const [loading, setLoading] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 600);
  };

  return (
    <AppShell
      title="Admin Command Center"
      subtitle="Fleet-wide infrastructure health, microservice registry, and global telemetry governance."
    >
      <div className="space-y-6">
        {/* Action Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Cluster Operational (Docker Swarm / Compose)
            </span>
          </div>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            <span>Sync Cluster Metrics</span>
          </button>
        </div>

        {/* Global KPI Cards Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="panel p-5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ingestion Velocity</span>
              <Activity className="h-4 w-4 text-cyan-400" />
            </div>
            <p className="mt-3 text-2xl font-extrabold text-white">
              {stats.events_per_sec} <span className="text-xs font-normal text-slate-400">evt/sec</span>
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              <span>Redis Stream Pipeline Healthy</span>
            </div>
          </div>

          <div className="panel p-5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">P95 Latency</span>
              <Cpu className="h-4 w-4 text-blue-400" />
            </div>
            <p className="mt-3 text-2xl font-extrabold text-blue-400">
              {stats.p95_latency_ms} <span className="text-xs font-normal text-slate-400">ms</span>
            </p>
            <div className="mt-2 text-[10px] text-slate-400">
              Target threshold &lt; 50ms
            </div>
          </div>

          <div className="panel p-5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Global Error Ratio</span>
              <ShieldAlert className="h-4 w-4 text-rose-400" />
            </div>
            <p className="mt-3 text-2xl font-extrabold text-rose-400">
              {(stats.error_ratio * 100).toFixed(1)}%
            </p>
            <div className="mt-2 text-[10px] text-amber-400">
              Normal operating bounds (&lt; 5.0%)
            </div>
          </div>

          <div className="panel p-5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Services</span>
              <Server className="h-4 w-4 text-purple-400" />
            </div>
            <p className="mt-3 text-2xl font-extrabold text-white">
              {stats.active_services_count} <span className="text-xs font-normal text-slate-400">Nodes</span>
            </p>
            <div className="mt-2 text-[10px] text-purple-300">
              Node & Python SDK Connected
            </div>
          </div>
        </div>

        {/* Microservice Fleet Registry Table */}
        <div className="panel overflow-hidden p-0">
          <div className="border-b border-slate-800/80 bg-slate-950/40 p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Registered Microservices Fleet</h3>
            <p className="mt-0.5 text-xs text-slate-400">Active telemetry-emitting containers and SDK instances.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-slate-800 bg-slate-950/20 text-slate-400">
                <tr>
                  <th className="p-4 font-medium">Service Identifier</th>
                  <th className="p-4 font-medium">Runtime Stack</th>
                  <th className="p-4 font-medium">API Key Prefix</th>
                  <th className="p-4 font-medium">Ingestion Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                <tr>
                  <td className="p-4 font-bold text-white flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                    node-sdk-service
                  </td>
                  <td className="p-4 text-slate-400">Node.js 18 / TypeScript</td>
                  <td className="p-4 text-slate-500">aura_sec_****123</td>
                  <td className="p-4 text-emerald-400">Streaming Active</td>
                  <td className="p-4 text-right">
                    <button className="rounded bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-700">Configure</button>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-white flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                    python-fastapi-backend
                  </td>
                  <td className="p-4 text-slate-400">Python 3.11 / FastAPI</td>
                  <td className="p-4 text-slate-500">aura_sec_****987</td>
                  <td className="p-4 text-emerald-400">Streaming Active</td>
                  <td className="p-4 text-right">
                    <button className="rounded bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-700">Configure</button>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-white flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                    hdfs-datanode-simulator
                  </td>
                  <td className="p-4 text-slate-400">Python Script / Benchmark</td>
                  <td className="p-4 text-slate-500">aura_sec_****123</td>
                  <td className="p-4 text-amber-400">Intermittent / Batch</td>
                  <td className="p-4 text-right">
                    <button className="rounded bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-700">Configure</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Global System Settings */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="panel p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Database className="h-4 w-4 text-cyan-400" />
              PostgreSQL Vector Store & pgvector Status
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Vector extension is active on PostgreSQL 16. HNSW indexes are indexing 384-dimensional sentence transformer embeddings for real-time error semantic searching.
            </p>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] text-slate-300 space-y-1">
              <div className="flex justify-between"><span>Extension:</span> <span className="text-emerald-400">vector (v0.5.1+)</span></div>
              <div className="flex justify-between"><span>Index Type:</span> <span className="text-cyan-400">HNSW (vector_cosine_ops)</span></div>
              <div className="flex justify-between"><span>Stored Vectors:</span> <span className="text-white">1,420 Embeddings</span></div>
            </div>
          </div>

          <div className="panel p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-400" />
              Master API Key & Security Governance
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              All client SDK transports enforce mandatory <code className="text-slate-200">X-API-Key</code> request headers validated directly against the backend ingestion gateway.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                readOnly
                value="aura_secret_key_123"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-300"
              />
              <button
                onClick={() => alert("Master API key copied to clipboard!")}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-blue-500 shrink-0"
              >
                Copy Key
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}