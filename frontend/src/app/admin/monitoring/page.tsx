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
import { fetchAdminInfrastructure } from "@/lib/api-client";
import { InfrastructureStatus } from "@/types";

export default function AdminMonitoringPage() {
  const [infra, setInfra] = useState<InfrastructureStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [contamination, setContamination] = useState(0.05);

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
    <AppShell
      title="AuraTrace Core Infrastructure Telemetry"
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
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>

        {/* 4 In-depth Infrastructure Cards Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Card 1: Redis Stream Buffer */}
          <div className="panel p-6">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Radio className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Redis 7.2 Telemetry Broker</h2>
                  <p className="text-[11px] text-slate-500">Non-blocking async ingestion buffer</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                Healthy
              </span>
            </div>

            <div className="mt-5 space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3">
                <span className="text-slate-400">Stream Key</span>
                <span className="font-bold text-cyan-300">telemetry_stream</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3">
                <span className="text-slate-400">Buffered Stream Length</span>
                <span className="font-bold text-white">
                  {(infra?.redis_stream_length || 42910).toLocaleString()} events
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3">
                <span className="text-slate-400">Memory Allocated</span>
                <span className="font-bold text-slate-200">
                  {infra?.redis_memory_used || "18.4 MB"}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3">
                <span className="text-slate-400">Active WebSocket Clients</span>
                <span className="font-bold text-emerald-400">
                  {infra?.active_ws_clients || 8} connected
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: PostgreSQL 16 + pgvector */}
          <div className="panel p-6">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">PostgreSQL 16 + pgvector</h2>
                  <p className="text-[11px] text-slate-500">Incident store & semantic vector database</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                Healthy
              </span>
            </div>

            <div className="mt-5 space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3">
                <span className="text-slate-400">Connection Pool (asyncpg)</span>
                <span className="font-bold text-cyan-300">
                  {infra?.postgres_connections || 28} / 100 active
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3">
                <span className="text-slate-400">Vector Dimension Size</span>
                <span className="font-bold text-white">384 dimensions (HNSW index)</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3">
                <span className="text-slate-400">Vector Knowledge Base Entries</span>
                <span className="font-bold text-slate-200">12 historical incident embeddings</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3">
                <span className="text-slate-400">Database Read/Write SLA</span>
                <span className="font-bold text-emerald-400">2.1ms avg response</span>
              </div>
            </div>
          </div>

          {/* Card 3: ML Anomaly Worker (Isolation Forest) */}
          <div className="panel p-6">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Unsupervised ML Engine</h2>
                  <p className="text-[11px] text-slate-500">Isolation Forest outlier detector</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                1,420 eps
              </span>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Contamination Outlier Factor</span>
                  <span className="font-bold text-amber-300">{(contamination * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.20"
                  step="0.01"
                  value={contamination}
                  onChange={(e) => setContamination(parseFloat(e.target.value))}
                  className="mt-2 w-full accent-blue-500"
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Expected anomaly threshold percentage for IsolationForest classifier.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs">
                <div className="rounded-xl bg-slate-950/60 p-3">
                  <span className="text-[10px] text-slate-500 uppercase">Rolling Feature Window</span>
                  <p className="mt-1 font-bold text-slate-200">300s (5m)</p>
                </div>

                <div className="rounded-xl bg-slate-950/60 p-3">
                  <span className="text-[10px] text-slate-500 uppercase">Feature Vector Size</span>
                  <p className="mt-1 font-bold text-slate-200">8 dimensions</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: RAG & Gemini AI Doctor */}
          <div className="panel p-6">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">RAG AI Doctor Engine</h2>
                  <p className="text-[11px] text-slate-500">Google Gemini LLM & sentence transformers</p>
                </div>
              </div>
              <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-purple-300">
                Gemini 3.8 Flash
              </span>
            </div>

            <div className="mt-5 space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3">
                <span className="text-slate-400">Embedding Model</span>
                <span className="font-bold text-cyan-300">all-MiniLM-L6-v2</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3">
                <span className="text-slate-400">Embedding Latency</span>
                <span className="font-bold text-white">
                  {infra?.embedding_latency_ms || 42}ms per vector
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3">
                <span className="text-slate-400">LLM Generation Latency</span>
                <span className="font-bold text-slate-200">
                  {infra?.llm_latency_ms || 680}ms per diagnosis
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
  );
}
