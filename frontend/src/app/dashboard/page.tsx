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
      console.log("[AuraTrace Dashboard] Real-time anomaly received:", alert);
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

  // Compute metrics from actual backend values
  const ingestionRps = stats?.ingestion_rate_per_sec !== undefined
    ? Math.round(stats.ingestion_rate_per_sec)
    : 0;

  const p95Latency = stats?.p95_latency_ms !== undefined
    ? Math.round(stats.p95_latency_ms)
    : 0;

  const errorRate = stats?.error_rate_percent !== undefined
    ? `${stats.error_rate_percent.toFixed(1)}%`
    : "0.0%";

  const activeIncidents = stats?.open_incidents_count !== undefined
    ? stats.open_incidents_count
    : incidents.filter((i) => i.status === "OPEN").length;

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
            value={ingestionRps}
            unit="events/s"
            description="Redis Stream buffer active"
            badge="Live API"
            icon={Activity}
            tone="slate"
          />

          <SummaryMetricCard
            title="P95 Cluster Latency"
            value={p95Latency}
            unit="ms"
            description="Current backend aggregate"
            badge="Live API"
            icon={Clock}
            tone="slate"
          />

          <SummaryMetricCard
            title="Global Error Rate"
            value={errorRate}
            description="Current backend aggregate"
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
