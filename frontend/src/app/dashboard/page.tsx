"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Clock3,
  Radio,
  RefreshCw,
  Server,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { IncidentOverview } from "@/components/dashboard/IncidentOverview";
import { AnomalyAlertBanner } from "@/components/anomaly-alert-banner";
import { useWebSocket, AnomalyAlertEvent } from "@/hooks/use-websocket";
import { useIncidents } from "@/hooks/use-incidents";
import { MOCK_PERFORMANCE_METRICS } from "@/lib/mockData";

export default function DashboardPage() {
  const [currentAlert, setCurrentAlert] = useState<AnomalyAlertEvent | null>(null);

  const { isConnected } = useWebSocket((alert) => {
    setCurrentAlert(alert);
    refresh();
  });

  const { incidents, stats, loading, refresh } = useIncidents(5000);

  return (
    <AppShell
      title="Developer Dashboard"
      subtitle="Autonomous Telemetry & AI Command Center"
    >
      <div className="space-y-6">
        {/* Top Banner / Welcome Bar */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-cyan-400">
                <Activity className="h-4 w-4" />
              </span>
              <span className="label">Autonomous Observability Command Center</span>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
              System Health & Telemetry Overview
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => refresh()}
              disabled={loading}
              className="button-secondary"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh State</span>
            </button>

            <Link
              href="/telemetry"
              className="button-primary"
            >
              <Radio className="h-3.5 w-3.5 animate-pulse text-cyan-200" />
              <span>Live Telemetry Stream</span>
            </Link>
          </div>
        </div>

        {/* Anomaly Alert Popup Banner */}
        <AnomalyAlertBanner alert={currentAlert} onDismiss={() => setCurrentAlert(null)} />

        {/* KPI Metric Cards Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Telemetry Ingestion"
            value={stats.ingestion_rate_per_sec.toLocaleString()}
            unit="eps"
            delta="+14.2%"
            deltaType="increase"
            subtitle={`${stats.total_logs_ingested.toLocaleString()} total logs ingested`}
            icon={Activity}
            tone="cyan"
          />

          <MetricCard
            title="P95 Latency"
            value={stats.p95_latency_ms}
            unit="ms"
            delta="-8.4%"
            deltaType="increase"
            subtitle={stats.p95_latency_ms < 300 ? "Nominal performance" : "Elevated response time"}
            icon={Clock3}
            tone="violet"
          />

          <MetricCard
            title="Error Ratio"
            value={`${stats.error_rate_percent.toFixed(1)}%`}
            unit="window"
            delta={stats.error_rate_percent > 2 ? "+1.8%" : "Normal"}
            deltaType={stats.error_rate_percent > 2 ? "decrease" : "neutral"}
            subtitle={stats.error_rate_percent === 0 ? "Clean telemetry stream" : "Micro-errors detected"}
            icon={AlertTriangle}
            tone={stats.error_rate_percent > 2 ? "rose" : "amber"}
          />

          <MetricCard
            title="Active Incidents"
            value={stats.open_incidents_count}
            unit="open"
            delta="RAG Active"
            deltaType="neutral"
            subtitle={`${stats.active_services_count} active microservices`}
            icon={Server}
            tone="emerald"
          />
        </div>

        {/* Charts & Incident Overview Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Side: Real-time Performance & Latency Area Chart */}
          <div className="lg:col-span-8">
            <PerformanceChart data={MOCK_PERFORMANCE_METRICS} />
          </div>

          {/* Right Side: Incident Overview & Triage */}
          <div className="lg:col-span-4">
            <IncidentOverview incidents={incidents} onRefresh={refresh} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
