"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  BarChart3,
  Cpu,
  Database,
  Layers,
  Radio,
  RefreshCw,
  Server,
  ShieldAlert,
  Sliders,
  Sparkles,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { fetchAdminInfrastructure } from "@/lib/api-client";
import { InfrastructureStatus } from "@/types";

export default function AdminMonitoringPage() {
  const [infra, setInfra] = useState<InfrastructureStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchAdminInfrastructure();
    setInfra(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <ProtectedRoute role="Admin">
      <AppShell
        title="Core Infrastructure Telemetry"
        subtitle="Deep hardware & engine performance for Redis, PostgreSQL pgvector, and ML Isolation Forest"
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Cpu className="h-4 w-4" />
                </span>
                <span className="label">Engine Diagnostics</span>
              </div>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
                Cluster Infrastructure Telemetry
              </h1>
            </div>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="button-secondary"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`}
              />
              <span>Refresh Telemetry</span>
            </button>
          </div>

          {/* Engine Metric Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Redis Stream Broker */}
            <div className="panel p-5">
              <div className="flex items-center justify-between">
                <span className="label">Redis Stream Engine</span>
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="mt-4">
                <span className="font-mono text-2xl font-extrabold text-white">
                  {infra?.redis_stream_length != null ? infra.redis_stream_length.toLocaleString() : "—"}
                </span>
                <span className="ml-1 text-xs text-slate-500">buffered</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[11px] font-mono text-slate-400">
                <span>Memory Footprint</span>
                <span className="text-cyan-400">{infra?.redis_memory_used || "—"}</span>
              </div>
            </div>

            {/* PostgreSQL + pgvector */}
            <div className="panel p-5">
              <div className="flex items-center justify-between">
                <span className="label">pgvector Semantic Index</span>
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="mt-4">
                <span className="font-mono text-2xl font-extrabold text-white">
                  {infra?.postgres_vector_indexes != null ? infra.postgres_vector_indexes.toLocaleString() : "—"}
                </span>
                <span className="ml-1 text-xs text-slate-500">dim IVFFlat</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[11px] font-mono text-slate-400">
                <span>Active Connection Pool</span>
                <span className="text-indigo-400">{infra?.postgres_connections != null ? infra.postgres_connections : "—"}</span>
              </div>
            </div>

            {/* ML Isolation Forest */}
            <div className="panel p-5">
              <div className="flex items-center justify-between">
                <span className="label">ML Isolation Forest</span>
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="mt-4">
                <span className="font-mono text-2xl font-extrabold text-white">
                  {infra?.ml_queue_rate != null ? infra.ml_queue_rate : "—"}
                </span>
                <span className="ml-1 text-xs text-slate-500">infer/sec</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[11px] font-mono text-slate-400">
                <span>Contamination Factor</span>
                <span className="text-amber-400">{infra?.anomaly_threshold != null ? infra.anomaly_threshold : "—"}</span>
              </div>
            </div>

            {/* RAG Doctor AI Latency */}
            <div className="panel p-5">
              <div className="flex items-center justify-between">
                <span className="label">Gemini RAG Doctor</span>
                <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              </div>
              <div className="mt-4">
                <span className="font-mono text-2xl font-extrabold text-white">
                  {infra?.llm_latency_ms != null ? infra.llm_latency_ms : "—"}
                </span>
                <span className="ml-1 text-xs text-slate-500">ms P95</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[11px] font-mono text-slate-400">
                <span>Embedding Model</span>
                <span className="text-emerald-400">{infra?.embedding_model || "—"}</span>
              </div>
            </div>
          </div>

          {/* Detailed Engine Diagnostics Panes */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* ML Pipeline Configuration */}
            <div className="panel p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    ML Anomaly Tuning & Parameters
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-cyan-400">Scikit-Learn IsolationForest</span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">Contamination Threshold</span>
                    <span className="font-mono text-cyan-400 font-bold">{contamination}</span>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 font-mono text-xs text-slate-300">
                    Configured anomaly threshold: <span className="font-bold text-cyan-400">{infra?.anomaly_threshold ?? "—"}</span>
                    <span className="ml-3 text-slate-500">Rolling window: {infra?.anomaly_window_seconds ? `${infra.anomaly_window_seconds}s` : "—"}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Read-only values reported from the backend configuration; this dashboard does not mutate the ML worker at runtime.
                  </p>/p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <span className="text-[10px] uppercase text-slate-500 block">n_estimators</span>
                    <span className="text-white font-bold text-sm">100 Trees</span>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <span className="text-[10px] uppercase text-slate-500 block">max_samples</span>
                    <span className="text-white font-bold text-sm">auto (256)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RAG Knowledge Base Stats */}
            <div className="panel p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    RAG Knowledge Base & pgvector Index
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-indigo-400">{infra?.embedding_model || "Embedding model unavailable"}</span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3">
                  <span className="text-slate-400">Indexed Incident Embeddings</span>
                  <span className="font-bold text-white">{infra?.postgres_vector_indexes != null ? infra.postgres_vector_indexes : "—"} vector indexes</span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3">
                  <span className="text-slate-400">Embedding Computation</span>
                  <span className="font-bold text-cyan-400">{infra?.embedding_latency_ms != null ? infra.embedding_latency_ms : "—"}ms</span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3">
                  <span className="text-slate-400">LLM Generation Latency</span>
                  <span className="font-bold text-slate-200">
                    {infra?.llm_latency_ms != null ? infra.llm_latency_ms : "—"}ms per diagnosis
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3">
                  <span className="text-slate-400">RAG Context Injection</span>
                  <span className="font-bold text-emerald-400">Top-3 Cosine Candidates</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
