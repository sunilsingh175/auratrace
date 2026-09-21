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
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  <Cpu className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
                  Engine Diagnostics
                </span>
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 font-heading md:text-3xl">
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
                className={`h-3.5 w-3.5 ${loading ? "animate-spin text-slate-600" : ""}`}
              />
              <span>Refresh Telemetry</span>
            </button>
          </div>

          {/* Engine Metric Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Redis Stream Broker */}
            <div className="panel p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">Redis Stream Engine</span>
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="mt-4">
                <span className="font-mono text-2xl font-bold text-slate-900">
                  {infra?.redis_stream_length != null ? infra.redis_stream_length.toLocaleString() : "—"}
                </span>
                <span className="ml-1 text-xs text-slate-400">buffered</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-mono text-slate-500">
                <span>Memory Footprint</span>
                <span className="text-red-600 font-bold">{infra?.redis_memory_used || "—"}</span>
              </div>
            </div>

            {/* PostgreSQL + pgvector */}
            <div className="panel p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">pgvector Semantic Index</span>
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="mt-4">
                <span className="font-mono text-2xl font-bold text-slate-900">
                  {infra?.postgres_vector_indexes != null ? infra.postgres_vector_indexes.toLocaleString() : "—"}
                </span>
                <span className="ml-1 text-xs text-slate-400">dim IVFFlat</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-mono text-slate-500">
                <span>Active Connection Pool</span>
                <span className="text-red-600 font-bold">{infra?.postgres_connections != null ? infra.postgres_connections : "—"}</span>
              </div>
            </div>

            {/* ML Isolation Forest */}
            <div className="panel p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">ML Isolation Forest</span>
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="mt-4">
                <span className="font-mono text-2xl font-bold text-slate-900">
                  {infra?.ml_queue_rate != null ? infra.ml_queue_rate : "—"}
                </span>
                <span className="ml-1 text-xs text-slate-400">infer/sec</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-mono text-slate-500">
                <span>Contamination Factor</span>
                <span className="text-amber-600 font-bold">{infra?.anomaly_threshold != null ? infra.anomaly_threshold : "—"}</span>
              </div>
            </div>

            {/* RAG Doctor AI Latency */}
            <div className="panel p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">Gemini RAG Doctor</span>
                <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              </div>
              <div className="mt-4">
                <span className="font-mono text-2xl font-bold text-slate-900">
                  {infra?.llm_latency_ms != null ? infra.llm_latency_ms : "—"}
                </span>
                <span className="ml-1 text-xs text-slate-400">ms P95</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-mono text-slate-500">
                <span>Embedding Model</span>
                <span className="text-emerald-600 font-bold">{infra?.embedding_model || "—"}</span>
              </div>
            </div>
          </div>

          {/* Detailed Engine Diagnostics Panes */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* ML Pipeline Configuration */}
            <div className="panel p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-red-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-heading">
                    ML Anomaly Tuning & Parameters
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-red-600 font-bold">Scikit-Learn IsolationForest</span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 font-heading">Anomaly Detection Threshold</span>
                    <span className="font-mono text-red-600 font-bold">{infra?.anomaly_threshold ?? "—"}</span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-3 font-mono text-xs text-slate-700 mt-1.5">
                    Configured anomaly threshold: <span className="font-bold text-red-600">{infra?.anomaly_threshold ?? "—"}</span>
                    <span className="ml-3 text-slate-400">Rolling window: {infra?.anomaly_window_seconds ? `${infra.anomaly_window_seconds}s` : "—"}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Read-only values reported from the backend configuration; this dashboard does not mutate the ML worker at runtime.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs">
                  <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-3">
                    <span className="text-[10px] uppercase text-slate-400 block font-heading">n_estimators</span>
                    <span className="text-slate-900 font-bold text-sm">200 Trees</span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-3">
                    <span className="text-[10px] uppercase text-slate-400 block font-heading">max_samples</span>
                    <span className="text-slate-900 font-bold text-sm">4096</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RAG Knowledge Base Stats */}
            <div className="panel p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-red-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-heading">
                    RAG Knowledge Base & pgvector Index
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-red-600 font-bold">{infra?.embedding_model || "Embedding model unavailable"}</span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between rounded-xl bg-[#f8fafc] border border-slate-200 p-3">
                  <span className="text-slate-600">Indexed Incident Embeddings</span>
                  <span className="font-bold text-slate-900">{infra?.postgres_vector_indexes != null ? infra.postgres_vector_indexes : "—"} vector indexes</span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#f8fafc] border border-slate-200 p-3">
                  <span className="text-slate-600">Embedding Computation</span>
                  <span className="font-bold text-red-600">{infra?.embedding_latency_ms != null ? infra.embedding_latency_ms : "—"}ms</span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#f8fafc] border border-slate-200 p-3">
                  <span className="text-slate-600">LLM Generation Latency</span>
                  <span className="font-bold text-slate-800">
                    {infra?.llm_latency_ms != null ? infra.llm_latency_ms : "—"}ms per diagnosis
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#f8fafc] border border-slate-200 p-3">
                  <span className="text-slate-600">RAG Context Injection</span>
                  <span className="font-bold text-emerald-600">Top-3 Cosine Candidates</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
