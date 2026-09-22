"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Activity,
  Clock,
  Percent,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PipelineStatusCard } from "@/components/dashboard/PipelineStatusCard";
import { SummaryMetricCard } from "@/components/dashboard/SummaryMetricCard";
import { PerformanceChartCard } from "@/components/dashboard/PerformanceChartCard";
import { ActiveAnomaliesPanel } from "@/components/dashboard/ActiveAnomaliesPanel";
import { MonitoredServicesPanel } from "@/components/dashboard/MonitoredServicesPanel";
import { SdkIntegrationCards } from "@/components/dashboard/SdkIntegrationCards";
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
      console.log("[Trace Dashboard] Real-time anomaly received:", alert);
      void loadDashboardData();
    },
    [loadDashboardData]
  );

  const { isConnected } = useWebSocket(handleRealtimeAlert);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 4000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  // Compute metrics from backend stats with graceful service aggregation consistency
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

  // 1. Ingestion Velocity: active rps, or 0 if buffered/idle, or Unavailable
  const ingestionRpsValue =
    stats?.ingestion_rate_per_sec !== undefined && stats.ingestion_rate_per_sec > 0
      ? Math.round(stats.ingestion_rate_per_sec)
      : (stats?.total_logs_ingested && stats.total_logs_ingested > 0) || totalServiceRequests > 0
      ? 0
      : "Unavailable";

  // 2. P95 Cluster Latency: live stats p95, or service aggregate weighted latency, or Unavailable
  const rawP95 =
    stats?.p95_latency_ms !== undefined && stats.p95_latency_ms > 0
      ? stats.p95_latency_ms
      : aggregateLatency !== null && aggregateLatency > 0
      ? aggregateLatency
      : null;
  const p95LatencyValue =
    rawP95 !== null ? Math.round(rawP95) : "Unavailable";

  // 3. Global Error Rate: live stats error rate, or service aggregate error rate, or 0.0% if services healthy, or Unavailable
  const rawError =
    stats?.error_rate_percent !== undefined && stats.error_rate_percent > 0
      ? stats.error_rate_percent
      : aggregateErrorRate !== null
      ? aggregateErrorRate
      : totalServiceRequests > 0
      ? 0.0
      : null;
  const errorRateValue =
    rawError !== null ? `${rawError.toFixed(1)}%` : "Unavailable";

  // 4. Active Incidents
  const activeIncidents =
    stats?.open_incidents_count !== undefined
      ? stats.open_incidents_count
      : incidents.filter((i) => i.status === "OPEN" || i.status === "INVESTIGATING").length;

  return (
    <AppShell
      title="Dashboard"
      subtitle="Real-time overview of your infrastructure and services"
    >
      <div className="space-y-6 max-w-[1600px] mx-auto pb-6">
        {/* 1. Pipeline Status Card */}
        <PipelineStatusCard isOnline={isConnected} />

        {/* 2. Four Large Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <SummaryMetricCard
            title="Ingestion Velocity"
            value={ingestionRpsValue}
            unit={typeof ingestionRpsValue === "number" ? "events/s" : undefined}
            description="Redis Stream buffer active"
            badge="Live API"
            icon={Activity}
            tone="slate"
          />

          <SummaryMetricCard
            title="P95 Cluster Latency"
            value={p95LatencyValue}
            unit={typeof p95LatencyValue === "number" ? "ms" : undefined}
            description="Cluster P95 latency aggregate"
            badge="Live API"
            icon={Clock}
            tone="slate"
          />

          <SummaryMetricCard
            title="Global Error Rate"
            value={errorRateValue}
            description="Cluster telemetry error ratio"
            badge="Live API"
            icon={Percent}
            tone="slate"
          />

          <SummaryMetricCard
            title="Active Incidents"
            value={activeIncidents}
            unit="open"
            description="pgvector RAG diagnosis connected"
            badge="Live API"
            icon={AlertTriangle}
            tone="red"
          />
        </div>

        {/* 3. Performance Section: Cluster Performance & Latency Waveform */}
        <PerformanceChartCard data={timeSeries} />

        {/* 4. Active Anomalies & Triage */}
        <ActiveAnomaliesPanel incidents={incidents} />

        {/* 5. Monitored Microservices Fleet */}
        <MonitoredServicesPanel services={services} />

        {/* 6. SDK Integration Cards (Python & Node.js / TypeScript) */}
        <SdkIntegrationCards />
      </div>
    </AppShell>
  );
}
