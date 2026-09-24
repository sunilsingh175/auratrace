"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  Percent,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  FileCode,
  Server,
  Terminal,
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

  // 2. Active Crashes
  const activeIncidents =
    stats?.open_incidents_count !== undefined
      ? stats.open_incidents_count
      : incidents.filter((i) => i.status === "OPEN" || i.status === "INVESTIGATING").length;

  // 3. Total Crashes
  const totalCrashes =
    stats?.total_logs_ingested !== undefined && stats.total_logs_ingested > 0
      ? stats.total_logs_ingested
      : incidents.length;

  // Diagnosed Incidents for AI Diagnosis Showcase
  const diagnosedIncidents = incidents.filter(
    (i) => i.is_diagnosed || (i.ai_root_cause && !i.ai_root_cause.includes("processing in background"))
  );

  return (
    <AppShell
      title="Dashboard"
      subtitle="Real-time application health, crash telemetry, and AI diagnosis"
    >
      <div className="page-container max-w-6xl">
        {/* Application Health - 3 Clean Cards */}
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

        {/* Recent AI Diagnoses Section */}
        {diagnosedIncidents.length > 0 && (
          <div className="panel p-6 bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <div>
                  <h2 className="font-heading font-extrabold text-lg text-slate-900 tracking-tight">
                    Recent AI Diagnoses
                  </h2>
                  <p className="text-xs text-slate-500 font-sans mt-0.5">
                    pgvector semantic matching &amp; Gemini synthesized root-cause recovery patches
                  </p>
                </div>
              </div>
              <Link
                href="/incidents"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-700 transition font-heading"
              >
                <span>View all diagnoses</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {diagnosedIncidents.slice(0, 3).map((incident) => {
                const serviceName = incident.service_id || "Unknown application";
                const incidentTitle =
                  incident.title ||
                  incident.error_type ||
                  `Unhandled Exception in ${serviceName}`;

                return (
                  <div
                    key={incident.id}
                    className="p-4 rounded-xl border border-purple-100/70 bg-purple-50/20 hover:bg-purple-50/40 transition-all space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200 px-2.5 py-0.5 text-[10px] font-bold text-purple-700 font-heading">
                          <CheckCircle2 className="h-3 w-3" />
                          AI Patch Ready
                        </span>
                        <span className="text-xs font-bold text-slate-900 font-heading truncate">
                          {incidentTitle}
                        </span>
                      </div>

                      <Link
                        href={`/incidents/${incident.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 text-xs font-bold font-heading transition cursor-pointer self-start sm:self-auto shrink-0"
                      >
                        <FileCode className="h-3.5 w-3.5" />
                        <span>View Diagnosis &amp; Patch</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>

                    {incident.ai_root_cause && (
                      <p className="text-xs text-slate-700 font-sans line-clamp-2 bg-white/80 p-2.5 rounded-lg border border-purple-100">
                        {incident.ai_root_cause}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-[11px] text-slate-500 font-sans pt-1">
                      <div className="flex items-center gap-1">
                        <Server className="h-3 w-3 text-slate-400" />
                        <span>{serviceName}</span>
                      </div>
                      {incident.error_type && (
                        <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
                          <Terminal className="h-3 w-3" />
                          <span>{incident.error_type}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
