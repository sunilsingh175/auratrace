"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, ArrowRight, Cpu, Layers, Radio, RefreshCw, Server, Sparkles, Zap } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { IncidentOverview } from "@/components/dashboard/IncidentOverview";
import { fetchSystemStats, fetchIncidents, fetchServices, fetchPerformanceTimeseries } from "@/lib/api-client";
import { SystemStats, Incident, Service, PerformanceDataPoint } from "@/types";

export default function DeveloperDashboardPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [timeSeries, setTimeSeries] = useState<PerformanceDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      const [statsData, incidentsData, servicesData, timeseriesData] = await Promise.all([
        fetchSystemStats(),
        fetchIncidents({ limit: 5 }),
        fetchServices(),
        fetchPerformanceTimeseries(300, 5),
      ]);
      setStats(statsData);
      setIncidents(incidentsData);
      setServices(servicesData);

      const formattedPoints: PerformanceDataPoint[] = timeseriesData.map((pt) => ({
        time: new Date(pt.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        latency: pt.p95_latency || pt.latency || 0,
        errors: pt.errors || 0,
        requests: pt.requests || 0,
      }));
      setTimeSeries(formattedPoints);
    } catch (e) {
      console.warn("Failed loading live AuraTrace dashboard data:", e);
      setStats(null);
      setIncidents([]);
      setServices([]);
      setTimeSeries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadDashboardData();
  };

  const activeServicesCount = stats?.active_services_count;
  const ingestionRate = stats?.ingestion_rate_per_sec;
  const p95Latency = stats?.p95_latency_ms;
  const errorRate = stats?.error_rate_percent;
  const openIncidentsCount = stats?.open_incidents_count;

  const chartData: PerformanceDataPoint[] = timeSeries.length > 0
    ? timeSeries
    : stats
    ? [{
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        latency: p95Latency ?? 0,
        errors: errorRate ?? 0,
        requests: ingestionRate ?? 0,
      }]
    : [];

  return (
    <AppShell
      title="Developer Observability Hub"
      subtitle="Real-time telemetry streams, ML anomaly detection, and automated AI diagnosis."
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Pipeline Live: Redis Stream + pgvector Active
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-cyan-400 border border-blue-500/20">
              <Sparkles className="w-3 h-3 text-cyan-300" /> AI Doctor RAG Triaging
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="button-secondary"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-cyan-400" : ""}`}
              />
              <span>Refresh Metrics</span>
            </button>
            <Link href="/telemetry" className="button-primary">
              <Radio className="h-3.5 w-3.5 text-cyan-200 animate-pulse" />
              <span>Live Telemetry Stream</span>
            </Link>
          </div>
        </div>

        {loading && (
          <div className="panel px-5 py-3 text-xs text-slate-400">Loading verified backend telemetry…</div>
        )}

        {!loading && !stats && (
          <div className="panel border-amber-500/20 bg-amber-500/5 px-5 py-3 text-xs text-amber-300">
            Live backend metrics are unavailable. Dashboard operational values are intentionally not replaced with demo data.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Ingestion Velocity"
            value={typeof ingestionRate === "number" ? ingestionRate.toLocaleString() : "—"}
            unit={typeof ingestionRate === "number" ? "events/s" : ""}
            delta={typeof ingestionRate === "number" ? "Live API" : "Unavailable"}
            deltaType="neutral"
            subtitle="Redis Stream buffer active"
            icon={Activity}
            tone="cyan"
          />
          <MetricCard
            title="P95 Cluster Latency"
            value={typeof p95Latency === "number" ? p95Latency : "—"}
            unit={typeof p95Latency === "number" ? "ms" : ""}
            delta={typeof p95Latency === "number" ? "Live API" : "Unavailable"}
            deltaType="neutral"
            subtitle="Current backend aggregate"
            icon={Cpu}
            tone="indigo"
          />
          <MetricCard
            title="Global Error Rate"
            value={typeof errorRate === "number" ? `${errorRate.toFixed(1)}%` : "—"}
            unit=""
            delta={typeof errorRate === "number" ? "Live API" : "Unavailable"}
            deltaType="neutral"
            subtitle="Current backend aggregate"
            icon={Zap}
            tone={typeof errorRate === "number" && errorRate > 2 ? "rose" : "emerald"}
          />
          <MetricCard
            title="Active Incidents"
            value={typeof openIncidentsCount === "number" ? openIncidentsCount : "—"}
            unit={typeof openIncidentsCount === "number" ? "open" : ""}
            delta={typeof openIncidentsCount === "number" ? "Live API" : "Unavailable"}
            deltaType="neutral"
            subtitle="pgvector RAG diagnosis connected"
            icon={AlertTriangle}
            tone={typeof openIncidentsCount === "number" && openIncidentsCount > 0 ? "rose" : "emerald"}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <PerformanceChart data={chartData} />
          </div>
          <div className="lg:col-span-5">
            <IncidentOverview incidents={incidents} onRefresh={loadDashboardData} />
          </div>
        </div>

        <div className="panel p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40 p-5">
            <div>
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Monitored Microservices Fleet ({activeServicesCount ?? "—"})
                </h3>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                Connected service instances streaming metrics and error traces to AuraTrace.
              </p>
            </div>
            <Link
              href="/services"
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition"
            >
              <span>Manage Services</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {services.length > 0 ? (
            <div className="grid grid-cols-1 divide-y divide-slate-800/60 md:grid-cols-3 md:divide-x md:divide-y-0">
              {services.slice(0, 3).map((service) => {
                const isHealthy = service.status === "healthy";
                const isCritical = service.status === "critical";
                return (
                  <div key={service.id} className="p-5 space-y-3 hover:bg-slate-900/30 transition">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">{service.name}</span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          isCritical
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : isHealthy
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isCritical ? "bg-rose-400 animate-pulse" : isHealthy ? "bg-emerald-400" : "bg-amber-400"
                          }`}
                        />
                        {service.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="rounded-lg bg-slate-950/60 p-2 border border-slate-800/60">
                        <span className="text-[10px] text-slate-500 uppercase block">Latency</span>
                        <span className="text-white font-bold">{service.latency_ms}ms</span>
                      </div>
                      <div className="rounded-lg bg-slate-950/60 p-2 border border-slate-800/60">
                        <span className="text-[10px] text-slate-500 uppercase block">Error Rate</span>
                        <span className={service.error_rate > 3 ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                          {service.error_rate}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span className="font-mono text-slate-500">ID: {service.id}</span>
                      <Link
                        href={`/telemetry?service=${service.id}`}
                        className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
                      >
                        <span>Logs</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">No service records returned by the backend.</div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="panel p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Python SDK Integration</h3>
            </div>
            <p className="text-xs text-slate-400">
              Integrate the AuraTrace Python SDK directly into FastAPI, Django, or Flask applications.
            </p>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] text-cyan-300 overflow-x-auto">
              <code>
                from auratrace import AuraClient<br />
                aura = AuraClient(service_name=&quot;payment-api&quot;)<br />
                aura.capture_exception(e, request_context=ctx)
              </code>
            </div>
          </div>
          <div className="panel p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Node.js / TypeScript SDK</h3>
            </div>
            <p className="text-xs text-slate-400">
              Zero-configuration error capture and distributed telemetry middleware for Express & Next.js.
            </p>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] text-indigo-300 overflow-x-auto">
              <code>
                import &#123; AuraTrace &#125; from &apos;@auratrace/node&apos;;<br />
                AuraTrace.init(&#123; serviceId: &apos;order-service&apos; &#125;);<br />
                app.use(AuraTrace.expressMiddleware());
              </code>
            </div>
          </div>
        </div>
      </div>
      </AppShell>
  );
}
