"use client";

import React, { useState } from "react";
import { Radio, Terminal, Sparkles, Activity, Layers, Wifi, WifiOff } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { LogConsole } from "@/components/telemetry/LogConsole";
import { TelemetryChart } from "@/components/telemetry/TelemetryChart";
import { AnomalyAlertBanner } from "@/components/anomaly-alert-banner";
import { useWebSocket, AnomalyAlertEvent } from "@/hooks/use-websocket";
import { MOCK_PERFORMANCE_METRICS, MOCK_TELEMETRY_LOGS } from "@/lib/mockData";

export default function TelemetryPage() {
  const [currentAlert, setCurrentAlert] = useState<AnomalyAlertEvent | null>(null);

  const { isConnected, logs, clearLogs } = useWebSocket((alert) => {
    setCurrentAlert(alert);
  });

  // Combine real-time stream with mock fallback if initial buffer is empty
  const activeLogs = logs.length > 0 ? logs : (MOCK_TELEMETRY_LOGS as any);

  return (
    <AppShell
      title="Live Telemetry Inspector"
      subtitle="Real-time distributed Redis stream log inspector & WebSocket ingest"
    >
      <div className="space-y-6">
        {/* Top Header */}
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
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold ${
                isConnected
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-slate-800 bg-slate-900 text-slate-400"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isConnected ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                }`}
              />
              {isConnected ? "WebSocket Connected (ws://localhost:8000)" : "Simulated Stream (Standalone)"}
            </span>
          </div>
        </div>

        {/* Alert Banner */}
        <AnomalyAlertBanner alert={currentAlert} onDismiss={() => setCurrentAlert(null)} />

        {/* Telemetry Waveform Chart */}
        <TelemetryChart data={MOCK_PERFORMANCE_METRICS} />

        {/* Terminal Streaming Console */}
        <LogConsole
          logs={activeLogs}
          onClear={clearLogs}
          isConnected={isConnected}
        />
      </div>
    </AppShell>
  );
}
