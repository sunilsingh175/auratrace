"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Activity,
  Clock,
  Percent,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SummaryMetricCard } from "@/components/dashboard/SummaryMetricCard";
import { PerformanceChartCard } from "@/components/dashboard/PerformanceChartCard";
import { ActiveAnomaliesPanel } from "@/components/dashboard/ActiveAnomaliesPanel";
import { useWebSocket, type AnomalyAlertEvent } from "@/hooks/use-websocket";
import {
  fetchSystemStats,
  fetchIncidents,
  fetchServices,
  fetchPerformanceTimeseries,
} from "@/lib/api-client";
import { SystemStats, Incident, Service } from "@/types";

export default function DashboardPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [timeSeries, setTimeSeries] = useState<
    { time: string; latency: number; errors: number; requests: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      const [statsData, incidentsData, servicesData, timeseriesData] =
        await Promise.all([
          fetchSystemStats().catch(() => null),
          fetchIncidents({ limit: 10 }).catch(() => []),
          fetchServices().catch(() => []),
          fetchPerformanceTimeseries(300, 5).catch(() => []),
        ]);

      if (statsData) setStats(statsData);
      if (incidentsData) setIncidents(incidentsData);
      if (servicesData) setServices(servicesData);

      if (timeseriesData && timeseriesData.length > 0) {
        const formattedPoints = timeseriesData.map((pt) => ({
          time: new Date(pt.time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          latency: pt.p95_latency || pt.latency || 0,
          errors: pt.errors || 0,
          requests: pt.requests || 0,
        }));
        setTimeSeries(formattedPoints);
      }
    } catch (e) {
      console.warn("Using backend live baseline for dashboard:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen to live WebSocket events to update dashboard in real-time
  const handleRealtimeAlert = useCallback(
    (alert: AnomalyAlertEvent) => {
      console.log("[AuraTrace Dashboard] Real-time anomaly received:", alert);
      void loadDashboardData();
    },
    [loadDashboardData]
  );

  useWebSocket(handleRealtimeAlert);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 4000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  // Compute metrics from backend stats with graceful fallback
  const totalServiceRequests = services.reduce(
    (acc, s) => acc + (typeof s.requests === "number" ? s.requests : 0),
    0
  );
  const aggregateErrorRate =
    totalServiceRequests > 0
      ? services.reduce(
          (acc, s) =>
            acc +
            (typeof s.requests === "number" ? s.requests : 0) *
              (typeof s.error_rate === "number" ? s.error_rate : 0),
          0
        ) / totalServiceRequests
      : null;
  const aggregateLatency =
    totalServiceRequests > 0
      ? services.reduce(
          (acc, s) =>
            acc +
            (typeof s.requests === "number" ? s.requests : 0) *
              (typeof s.latency_ms === "number" ? s.latency_ms : 0),
          0
        ) / totalServiceRequests
      : null;

  // 1. Error Rate
  const rawError =
    stats?.error_rate_percent !== undefined && stats.error_rate_percent > 0
      ? stats.error_rate_percent
      : aggregateErrorRate !== null
      ? aggregateErrorRate
      : totalServiceRequests > 0
      ? 0.0
      : null;
  const errorRateValue =
    rawError !== null ? `${rawError.toFixed(1)}%` : "0.0%";

  // 2. P95 Latency
  const rawP95 =
    stats?.p95_latency_ms !== undefined && stats.p95_latency_ms > 0
      ? stats.p95_latency_ms
      : aggregateLatency !== null && aggregateLatency > 0
      ? aggregateLatency
      : null;
  const p95LatencyValue =
    rawP95 !== null ? Math.round(rawP95) : 0;

  // 3. Active Crashes
  const activeIncidents =
    stats?.open_incidents_count !== undefined
      ? stats.open_incidents_count
      : incidents.filter((i) => i.status === "OPEN" || i.status === "INVESTIGATING").length;

  // 4. Total Crashes
  const totalCrashes =
    stats?.total_logs_ingested !== undefined && stats.total_logs_ingested > 0
      ? stats.total_logs_ingested
      : incidents.length;

  return (
    <AppShell
      title="Dashboard"
      subtitle="Real-time application health, crash telemetry, and performance"
    >
      <div className="space-y-6 max-w-[1600px] mx-auto pb-6">
        {/* Application Health Header & Metrics */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
              Application Health
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Telemetry Active</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <SummaryMetricCard
              title="Error Rate"
              value={errorRateValue}
              description="Application error ratio"
              badge="Live"
              icon={Percent}
              tone={rawError && rawError > 1 ? "red" : "slate"}
            />

            <SummaryMetricCard
              title="P95 Latency"
              value={p95LatencyValue}
              unit="ms"
              description="P95 response latency"
              badge="Live"
              icon={Clock}
              tone="slate"
            />

            <SummaryMetricCard
              title="Active Crashes"
              value={activeIncidents}
              unit="open"
              description="Unresolved incidents"
              badge="Live"
              icon={AlertTriangle}
              tone={activeIncidents > 0 ? "red" : "slate"}
            />

            <SummaryMetricCard
              title="Total Crashes"
              value={totalCrashes}
              unit="recorded"
              description="Total exception telemetry"
              badge="Total"
              icon={Activity}
              tone="slate"
            />
          </div>
        </div>

        {/* Recent Crashes */}
        <ActiveAnomaliesPanel incidents={incidents} />

        {/* Performance: Latency / Error chart */}
        <div>
          <div className="mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
              Performance
            </h2>
          </div>
          <PerformanceChartCard data={timeSeries} />
        </div>
      </div>
    </AppShell>
  );
}
