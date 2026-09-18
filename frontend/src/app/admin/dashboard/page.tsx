"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Cpu,
  Database,
  Flame,
  Radio,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { SystemHealthCard } from "@/components/admin/SystemHealthCard";
import { AnomalyHeatmap } from "@/components/admin/AnomalyHeatmap";
import { fetchAdminInfrastructure, fetchSystemStats } from "@/lib/api-client";
import { InfrastructureStatus, SystemStats } from "@/types";
import { MOCK_HEATMAP_DATA } from "@/lib/mockData";

export default function AdminDashboardPage() {
  const [infra, setInfra] = useState<InfrastructureStatus | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const [infraData, statsData] = await Promise.all([
      fetchAdminInfrastructure(),
      fetchSystemStats(),
    ]);
    setInfra(infraData);
    setStats(statsData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <ProtectedRoute role="Admin">
    <AppShell
      title="Admin Executive Command Center"
      subtitle="Cluster infrastructure health matrix, anomaly heatmaps and operational oversight"
    >
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span className="label">Cluster Administration</span>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
              Admin Executive Overview
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="button-secondary"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Matrix</span>
            </button>

            <Link
              href="/admin/monitoring"
              className="button-primary"
            >
              <Cpu className="h-3.5 w-3.5 text-cyan-200" />
              <span>Infrastructure Telemetry</span>
            </Link>
          </div>
        </div>

        {/* High-level KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Monitored Services"
            value={stats?.active_services_count || 5}
            unit="active"
            delta="100% Up"
            deltaType="increase"
            subtitle="5 distributed microservices"
            icon={Server}
            tone="cyan"
          />

          <MetricCard
            title="Team Users & Roles"
            value="5"
            unit="members"
            delta="2 Admins"
            deltaType="neutral"
            subtitle="Role-based access enforced"
            icon={Users}
            tone="indigo"
          />

          <MetricCard
            title="Total Logs Ingested"
            value={(stats?.total_logs_ingested || 482910).toLocaleString()}
            unit="events"
            delta="+1,420 eps"
            deltaType="increase"
            subtitle="Redis Stream buffer active"
            icon={Radio}
            tone="emerald"
          />

          <MetricCard
            title="Active Incidents"
            value={stats?.open_incidents_count || 2}
            unit="open"
            delta="AI Triaged"
            deltaType="neutral"
            subtitle="pgvector RAG connected"
            icon={AlertTriangle}
            tone={(stats?.open_incidents_count || 0) > 0 ? "rose" : "emerald"}
          />
        </div>

        {/* System Health Matrix (5 Core Nodes) */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              AuraTrace Cluster Service Health Matrix
            </h2>
            <span className="font-mono text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              All 5 Core Daemons Operational
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <SystemHealthCard
              name="FastAPI Ingestion"
              role="REST & WebSocket API"
              status={infra?.api_status || "healthy"}
              latency={`${infra?.api_latency_ms || 18}ms`}
              metricLabel="Port"
              metricValue="8000"
              icon={Activity}
            />

            <SystemHealthCard
              name="Redis Stream Broker"
              role="Telemetry Buffer"
              status={infra?.redis_status || "healthy"}
              latency="0.8ms"
              metricLabel="Backlog"
              metricValue={`${((infra?.redis_stream_length || 42910) / 1000).toFixed(1)}k`}
              icon={Radio}
            />

            <SystemHealthCard
              name="PostgreSQL 16"
              role="pgvector Vector Store"
              status={infra?.postgres_status || "healthy"}
              latency="2.1ms"
              metricLabel="Conns"
              metricValue={`${infra?.postgres_connections || 28}/100`}
              icon={Database}
            />

            <SystemHealthCard
              name="ML Worker Daemon"
              role="Isolation Forest"
              status={infra?.ml_worker_status || "healthy"}
              latency="5.2ms"
              metricLabel="Queue"
              metricValue={`${infra?.ml_queue_rate || 1420} eps`}
              icon={Zap}
            />

            <SystemHealthCard
              name="RAG Doctor LLM"
              role="Gemini 2.5 Flash"
              status={infra?.rag_doctor_status || "healthy"}
              latency={`${infra?.llm_latency_ms || 680}ms`}
              metricLabel="Embed"
              metricValue={`${infra?.embedding_latency_ms || 42}ms`}
              icon={Sparkles}
            />
          </div>
        </div>

        {/* Anomaly Heatmap */}
        <AnomalyHeatmap data={MOCK_HEATMAP_DATA} />

        {/* System Activity Log & Audit Feed */}
        <div className="panel p-5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Recent Cluster Audit & Security Events
              </h3>
            </div>
            <span className="font-mono text-[10px] text-slate-500">Live PostgreSQL Event Log</span>
          </div>

          <div className="mt-4 space-y-2.5 font-mono text-xs">
            <div className="flex items-center justify-between rounded-lg border border-slate-800/60 bg-slate-950/60 p-3">
              <div className="flex items-center gap-3">
                <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-bold text-cyan-400">
                  RAG_DOCTOR
                </span>
                <span className="text-slate-200">
                  Automated diagnosis synthesized for incident <strong>#INC-1024</strong> (Similarity: 96%)
                </span>
              </div>
              <span className="text-[10px] text-slate-500">2m ago</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-800/60 bg-slate-950/60 p-3">
              <div className="flex items-center gap-3">
                <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-bold text-rose-400">
                  ML_ANOMALY
                </span>
                <span className="text-slate-200">
                  Isolation Forest outlier triggered for service <strong>payment-api</strong> (Score: 0.94)
                </span>
              </div>
              <span className="text-[10px] text-slate-500">6m ago</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-800/60 bg-slate-950/60 p-3">
              <div className="flex items-center gap-3">
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                  SERVICE_REG
                </span>
                <span className="text-slate-200">
                  Service <strong>inventory-service</strong> authenticated and generated ingestion API key
                </span>
              </div>
              <span className="text-[10px] text-slate-500">1h ago</span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
    </ProtectedRoute>
  );
}
