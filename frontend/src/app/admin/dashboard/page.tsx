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
import { fetchAdminInfrastructure, fetchSystemStats, fetchIncidents } from "@/lib/api-client";
import { InfrastructureStatus, SystemStats, AnomalyHeatmapDay } from "@/types";


export default function AdminDashboardPage() {
  const [infra, setInfra] = useState<InfrastructureStatus | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const [infraData, statsData, incidentData] = await Promise.all([
      fetchAdminInfrastructure(),
      fetchSystemStats(),
      fetchIncidents({ limit: 500 }),
    ]);
    setInfra(infraData);
    setStats(statsData);
    setIncidents(incidentData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const heatmapData: AnomalyHeatmapDay[] = React.useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const buckets = days.map((day) => ({ day, hours: Array(24).fill(0) as number[] }));
    for (const incident of incidents) {
      const date = new Date(incident.created_at);
      if (Number.isNaN(date.getTime())) continue;
      const day = date.getDay();
      const hour = date.getHours();
      buckets[day].hours[hour] = Math.min(10, buckets[day].hours[hour] + 1);
    }
    return buckets;
  }, [incidents]);

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
                <span className="label">Cluster Control Surface</span>
              </div>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
                Executive Health & Ops Matrix
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="button-secondary"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`}
                />
                <span>Sync Node Cluster</span>
              </button>
              <Link href="/admin/monitoring" className="button-primary">
                <Cpu className="h-3.5 w-3.5 text-indigo-200" />
                <span>Deep Engine Telemetry</span>
              </Link>
            </div>
          </div>

          {/* Core Cluster Health Matrix (4 Core Systems) */}
          <div className="panel p-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Distributed Subsystem Health & Latency
                </h3>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                {infra ? "Live subsystem status" : "Awaiting health probes"}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SystemHealthCard
                name="FastAPI Ingestion Gateway"
                role="REST & WebSocket Broker"
                status={infra?.api_status || "unknown"}
                latency={infra?.api_latency_ms != null ? `${infra.api_latency_ms}ms` : "—"}
                metricLabel="Clients"
                metricValue={infra?.active_ws_clients != null ? `${infra.active_ws_clients} live` : "—"}
                icon={Radio}
              />

              <SystemHealthCard
                name="Redis Stream Engine"
                role="Event Pipeline Broker"
                status={infra?.redis_status || "unknown"}
                latency="—"
                metricLabel="Buffer"
                metricValue={infra?.redis_stream_length != null ? `${infra.redis_stream_length.toLocaleString()} msgs` : "—"}
                icon={Zap}
              />

              <SystemHealthCard
                name="PostgreSQL pgvector"
                role="Hybrid Storage & Vector DB"
                status={infra?.postgres_status || "unknown"}
                latency="—"
                metricLabel="Pool"
                metricValue={infra?.postgres_connections != null ? `${infra.postgres_connections}` : "—"}
                icon={Database}
              />

              <SystemHealthCard
                name="RAG Doctor LLM"
                role={infra?.llm_model || "LLM model unavailable"}
                status={infra?.rag_doctor_status || "unknown"}
                latency={infra?.llm_latency_ms != null ? `${infra.llm_latency_ms}ms` : "—"}
                metricLabel="Embed"
                metricValue={infra?.embedding_latency_ms != null ? `${infra.embedding_latency_ms}ms` : "—"}
                icon={Sparkles}
              />
            </div>
          </div>

          {/* Anomaly Heatmap */}
          <AnomalyHeatmap data={heatmapData} />

          {/* Recent live incidents */}
          <div className="panel p-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Recent Live Incidents
                </h3>
              </div>
              <span className="font-mono text-[10px] text-slate-500">Live backend incident records</span>
            </div>
            <div className="mt-4 space-y-2.5 font-mono text-xs">
              {incidents.slice(0, 5).length > 0 ? incidents.slice(0, 5).map((incident) => (
                <div key={incident.id} className="flex flex-col gap-2 rounded-lg border border-slate-800/60 bg-slate-950/60 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-bold text-rose-400">
                      {incident.severity || "ANOMALY"}
                    </span>
                    <span className="truncate text-slate-200">
                      {incident.error_type || incident.title || "Anomaly"} · {incident.service_id}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-[10px] text-slate-500">
                    <span>score {typeof incident.anomaly_score === "number" ? incident.anomaly_score.toFixed(2) : "—"}</span>
                    <span>{incident.created_at ? new Date(incident.created_at).toLocaleString() : "—"}</span>
                  </div>
                </div>
              )) : (
                <div className="rounded-lg border border-slate-800/60 bg-slate-950/60 p-4 text-center text-slate-500">
                  No incident records returned by the backend.
                </div>
              )}
            </div>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
