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
    try {
      const data = await fetchAdminInfrastructure();
      setInfra(data);
    } catch (err) {
      console.error("Failed to load infrastructure telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <ProtectedRoute role="Admin">
      <AppShell hideHeaderTitle>
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
                <span className={`flex h-2 w-2 rounded-full ${
                  infra?.redis_status === "healthy" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                }`} />
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
                <span className={`flex h-2 w-2 rounded-full ${
                  infra?.postgres_status === "healthy" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                }`} />
              </div>
              <div className="mt-4">
                <span className="font-mono text-2xl font-bold text-slate-900">
                  {infra?.embedding_dimension != null ? infra.embedding_dimension.toLocaleString() : "—"}
                </span>
                <span className="ml-1 text-xs text-slate-400">dim (model spec)</span>
              </div>
              <div className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-[11px] font-mono text-slate-500">
                <div className="flex items-center justify-between">
                  <span>Vector Indexes</span>
                  <span className="text-emerald-600 font-bold">{infra?.vector_index_count != null ? infra.vector_index_count : "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Active Connection Pool</span>
                  <span className="text-red-600 font-bold">{infra?.postgres_connections != null ? infra.postgres_connections : "—"}</span>
                </div>
              </div>
            </div>

            {/* ML Isolation Forest */}
            <div className="panel p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">ML Isolation Forest</span>
                <span className={`flex h-2 w-2 rounded-full ${
                  infra?.ml_worker_status === "healthy" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                }`} />
              </div>
              <div className="mt-4">
                <span className="font-mono text-2xl font-bold text-slate-900">
                  {infra?.ml_entries_processed != null ? infra.ml_entries_processed.toLocaleString() : "—"}
                </span>
                <span className="ml-1 text-xs text-slate-400">entries processed</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-mono text-slate-500">
                <span>Contamination Factor</span>
                <span className="text-amber-600 font-bold">{infra?.ml_contamination != null ? infra.ml_contamination : "—"}</span>
              </div>
            </div>

            {/* RAG Doctor AI Latency */}
            <div className="panel p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">Gemini RAG Doctor</span>
                <span className={`flex h-2 w-2 rounded-full ${
                  infra?.rag_doctor_status === "healthy" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                }`} />
              </div>
              <div className="mt-4">
                <span className="font-mono text-2xl font-bold text-slate-900">
                  {infra?.rag_doctor_status === "healthy" ? "Active" : infra?.rag_doctor_status ?? "—"}
                </span>
                <span className="ml-1 text-xs text-slate-400">LLM status</span>
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
                    RAG Knowledge Base &amp; pgvector Index
                  </h3>
                </div>
              </div>

              <div className="space-y-2 font-mono text-xs">
                {/* Embedding Model */}
                <div className="flex items-center justify-between rounded-xl bg-[#f8fafc] border border-slate-200 p-3">
                  <span className="text-slate-500 font-heading font-bold uppercase text-[10px] tracking-wider">Embedding Model</span>
                  <span className="font-bold text-emerald-700">
                    {infra?.embedding_model || "—"}
                  </span>
                </div>

                {/* Embedding Dimension */}
                <div className="flex items-center justify-between rounded-xl bg-[#f8fafc] border border-slate-200 p-3">
                  <span className="text-slate-500 font-heading font-bold uppercase text-[10px] tracking-wider">Embedding Dimension</span>
                  <span className="font-bold text-slate-900">
                    {infra?.embedding_dimension != null ? `${infra.embedding_dimension}` : "—"}
                  </span>
                </div>

                {/* Knowledge Records */}
                <div className="flex items-center justify-between rounded-xl bg-[#f8fafc] border border-slate-200 p-3">
                  <span className="text-slate-500 font-heading font-bold uppercase text-[10px] tracking-wider">Knowledge Records</span>
                  <span className="font-bold text-slate-900">
                    {infra?.indexed_knowledge_records != null ? infra.indexed_knowledge_records : "—"}
                  </span>
                </div>

                {/* Vector Indexes */}
                <div className="flex items-center justify-between rounded-xl bg-[#f8fafc] border border-slate-200 p-3">
                  <span className="text-slate-500 font-heading font-bold uppercase text-[10px] tracking-wider">Vector Indexes</span>
                  <span className="font-bold text-slate-900">
                    {infra?.vector_index_count != null ? infra.vector_index_count : "—"}
                  </span>
                </div>

                {/* RAG Retrieval strategy — fixed architectural constant */}
                <div className="flex items-center justify-between rounded-xl bg-[#f8fafc] border border-slate-200 p-3">
                  <span className="text-slate-500 font-heading font-bold uppercase text-[10px] tracking-wider">RAG Retrieval</span>
                  <span className="font-bold text-emerald-600">Top-3 cosine similarity</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
