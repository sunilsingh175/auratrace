"use client";

import React, { useMemo, useState } from "react";
import { Radio, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { LogConsole } from "@/components/telemetry/LogConsole";
import { TelemetryChart } from "@/components/telemetry/TelemetryChart";
import { AnomalyAlertBanner } from "@/components/anomaly-alert-banner";
import { useWebSocket, AnomalyAlertEvent, LogEvent } from "@/hooks/use-websocket";
import type { PerformanceDataPoint, TelemetryLog } from "@/types";

export default function TelemetryPage() {
  const searchParams = useSearchParams();
  const requestedService = searchParams.get("service") || "";
  const [currentAlert, setCurrentAlert] = useState<AnomalyAlertEvent | null>(null);
  const [chartData, setChartData] = useState<PerformanceDataPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);

  const { isConnected, logs, clearLogs } = useWebSocket((alert) => {
    setCurrentAlert(alert);
  });

  const loadTimeseries = async () => {
    setChartLoading(true);
    setChartError(null);
    try {
      const params = new URLSearchParams({ window_seconds: "300", bucket_seconds: "5" });
      if (requestedService) params.set("service_id", requestedService);
      const response = await fetch(`/api/aura?path=${encodeURIComponent(`stats/timeseries?${params.toString()}`)}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Telemetry API ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data?.points)) throw new Error("Invalid timeseries response");
      setChartData(
        data.points.map((point: any) => ({
          time: new Date(point.time).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" }),
          latency: Number(point.p95_latency ?? point.latency ?? 0),
          errors: Number(point.errors ?? 0),
          requests: Number(point.requests ?? 0),
        }))
      );
    } catch (error) {
      setChartData([]);
      setChartError(error instanceof Error ? error.message : "Unable to load telemetry metrics");
    } finally {
      setChartLoading(false);
    }
  };

  React.useEffect(() => {
    void loadTimeseries();
    const interval = window.setInterval(() => void loadTimeseries(), 5000);
    return () => window.clearInterval(interval);
  }, [requestedService]);

  const alertLog: LogEvent | null = useMemo(() => {
    if (!currentAlert) return null;
    return {
      id: currentAlert.incident_id,
      service_id: currentAlert.service_id,
      timestamp: currentAlert.timestamp,
      level: "ERROR",
      error_type: currentAlert.error_type,
      anomaly_score: currentAlert.anomaly_score,
      stack_trace: currentAlert.stack_trace,
      message: currentAlert.message || `${currentAlert.error_type} anomaly detected (score ${currentAlert.anomaly_score.toFixed(2)})`,
      metadata: { reason: currentAlert.reason, incident_id: currentAlert.incident_id },
    };
  }, [currentAlert]);

  const visibleLogs: TelemetryLog[] = useMemo(() => {
    const source = alertLog ? [alertLog, ...logs] : logs;
    const deduped = new Map<string, LogEvent>();
    source.forEach((log, index) => {
      const id = log.id || `${log.timestamp}-${log.service_id}-${log.message || index}`;
      if (!deduped.has(id)) deduped.set(id, log);
    });
    return Array.from(deduped.values())
      .filter((log) => !requestedService || log.service_id === requestedService)
      .map((log, index) => ({
        id: log.id || `live-${index}`,
        timestamp: log.timestamp,
        level: log.level === "CRITICAL" ? "ERROR" : log.level === "DEBUG" ? "INFO" : log.level,
        service_id: log.service_id,
        message: log.message || log.log_message || log.error_type || "Telemetry event",
        metadata: {
          ...log.metadata,
          latency_ms: log.latency_ms,
          error_type: log.error_type,
          anomaly_score: log.anomaly_score,
          stack_trace: log.stack_trace || log.raw_stack_trace,
        },
      }));
  }, [alertLog, logs, requestedService]);

  return (
    <AppShell
      title="Live Telemetry Inspector"
      subtitle={requestedService ? `Real-time telemetry stream for ${requestedService}` : "Real-time distributed telemetry and anomaly stream"}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                <Radio className="h-4 w-4 animate-pulse" />
              </span>
              <span className="label">Live Ingestion Pipeline</span>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
              Live Telemetry & Event Inspector
            </h1>
            {requestedService && (
              <p className="mt-1 font-mono text-xs text-cyan-400">Service: {requestedService}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold ${isConnected ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"}`}>
              <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
              {isConnected ? "WebSocket Connected" : "WebSocket Offline"}
            </span>
            <button type="button" onClick={() => void loadTimeseries()} disabled={chartLoading} className="button-secondary">
              <RefreshCw className={`h-3.5 w-3.5 ${chartLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        <AnomalyAlertBanner alert={currentAlert} onDismiss={() => setCurrentAlert(null)} />

        {chartError && (
          <div className="panel border-amber-500/20 bg-amber-500/5 px-5 py-3 text-xs text-amber-300">
            Live telemetry metrics are unavailable: {chartError}
          </div>
        )}

        {!chartLoading && !chartError && chartData.length === 0 && (
          <div className="panel px-5 py-3 text-xs text-slate-400">
            No telemetry points were recorded in the current 5-minute window{requestedService ? ` for ${requestedService}` : ""}.
          </div>
        )}

        <TelemetryChart data={chartData} />

        <LogConsole
          logs={visibleLogs}
          onClear={clearLogs}
          isConnected={isConnected}
        />
      </div>
    </AppShell>
  );
}
