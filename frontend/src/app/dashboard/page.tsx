"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Activity,
  Percent,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SummaryMetricCard } from "@/components/dashboard/SummaryMetricCard";
import { ActiveAnomaliesPanel } from "@/components/dashboard/ActiveAnomaliesPanel";
import { useWebSocket, type AnomalyAlertEvent } from "@/hooks/use-websocket";
import {
  fetchSystemStats,
  fetchIncidents,
  fetchServices,
} from "@/lib/api-client";
import { SystemStats, Incident, Service } from "@/types";

export default function DashboardPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      const [statsData, incidentsData, servicesData] = await Promise.all([
        fetchSystemStats().catch(() => null),
        fetchIncidents({ limit: 10 }).catch(() => []),
        fetchServices().catch(() => []),
      ]);

      if (statsData) setStats(statsData);
      if (incidentsData) setIncidents(incidentsData);
      if (servicesData) setServices(servicesData);
    } catch (e) {
      console.warn("Using backend live baseline for dashboard:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time WebSocket listener: new crashes update instantly without page refresh
  const handleRealtimeAlert = useCallback(
    (alert: AnomalyAlertEvent) => {
      console.log("[AutoTrace Dashboard] Real-time crash alert received:", alert);
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

  // Compute metrics
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
    rawError !== null ? `${rawError.toFixed(2)}%` : "0.00%";

  // 2. Active Crashes
  const activeIncidents =
    stats?.open_incidents_count !== undefined
      ? stats.open_incidents_count
      : incidents.filter((i) => i.status === "OPEN" || i.status === "INVESTIGATING").length;

  // 3. Total Crashes
  const totalCrashes =
    stats?.total_incidents_count !== undefined
      ? stats.total_incidents_count
      : incidents.length;

  return (
    <AppShell
      title="Dashboard"
      subtitle="Application health, active crashes &amp; automated AI diagnosis"
    >
      <div className="page-container max-w-6xl space-y-8">
        {/* Application Health - 3 Deliberately Simple Cards */}
        <div>
          <div className="mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
              Application Health
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <SummaryMetricCard
              title="Error Rate"
              value={errorRateValue}
              description="Application error ratio"
              badge="Live"
              icon={Percent}
              tone={rawError && rawError > 1 ? "red" : "slate"}
            />

            <SummaryMetricCard
              title="Active Crashes"
              value={activeIncidents}
              unit="open"
              description="Unresolved exceptions"
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

        {/* Recent Crashes Panel */}
        <ActiveAnomaliesPanel incidents={incidents} />
      </div>
    </AppShell>
  );
}
