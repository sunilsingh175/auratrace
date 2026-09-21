"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Terminal,
  Search,
  Filter,
  Pause,
  Play,
  Trash2,
  Copy,
  Check,
  Download,
  Activity,
  Layers,
} from "lucide-react";
import { TelemetryLog } from "@/types";

interface LogConsoleProps {
  logs: TelemetryLog[];
  onClear?: () => void;
  isConnected?: boolean;
}

export function LogConsole({ logs, onClear, isConnected = true }: LogConsoleProps) {
  const [levelFilter, setLevelFilter] = useState<"ALL" | "INFO" | "WARN" | "ERROR">("ALL");
  const [serviceFilter, setServiceFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [copied, setCopied] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll unless user paused
  useEffect(() => {
    if (!isPaused && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isPaused]);

  // Unique services
  const uniqueServices = Array.from(
    new Set(logs.map((l) => l.service_id).filter(Boolean))
  );

  const filteredLogs = logs.filter((log) => {
    if (levelFilter !== "ALL" && log.level !== levelFilter) return false;
    if (serviceFilter !== "ALL" && log.service_id !== serviceFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        log.service_id?.toLowerCase().includes(q) ||
        log.timestamp.includes(q)
      );
    }
    return true;
  });

  const handleCopyLogs = () => {
    const text = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.level}] [${l.service_id || "global"}] ${l.message}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportLogs = () => {
    const text = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trace-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="panel flex flex-col overflow-hidden p-0">
      {/* Console Header / Controls */}
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <Terminal className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 font-heading">Realtime Telemetry Console</h2>
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                {isConnected ? "Live (Redis/WS)" : "Offline"}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Streaming distributed JSON telemetry logs & anomaly traces
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Level Switcher */}
          <div className="flex rounded-xl border border-slate-200 bg-[#f1f4f9] p-1">
            {(["ALL", "INFO", "WARN", "ERROR"] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevelFilter(lvl)}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition ${
                  levelFilter === lvl
                    ? lvl === "ERROR"
                      ? "bg-rose-600 text-white"
                      : lvl === "WARN"
                      ? "bg-amber-600 text-white"
                      : "bg-[#dc2626] text-white"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Service Dropdown */}
          {uniqueServices.length > 0 && (
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-[#f1f4f9] px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 outline-none"
            >
              <option value="ALL">All Services</option>
              {uniqueServices.map((svc) => (
                <option key={svc} value={svc}>
                  {svc}
                </option>
              ))}
            </select>
          )}

          {/* Pause / Resume */}
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
              isPaused
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            <span>{isPaused ? "Resume" : "Pause"}</span>
          </button>

          {/* Copy */}
          <button
            type="button"
            onClick={handleCopyLogs}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            title="Copy Filtered Logs"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
          </button>

          {/* Clear */}
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
              title="Clear Console"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="border-b border-slate-100 bg-[#f8fafc] px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search log messages, traces, exception classes, or correlation IDs..."
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs font-mono text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-red-500"
          />
        </div>
      </div>

      {/* Console Output Screen */}
      <div className="h-[460px] overflow-y-auto bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200">
        {filteredLogs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Layers className="h-8 w-8 text-slate-700" />
            <p className="mt-2 font-sans text-xs font-semibold text-slate-400">
              No matching log events
            </p>
            <p className="text-[10px] text-slate-600">
              Logs matching filters or streaming from Redis will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredLogs.map((log, index) => {
              const isErr = log.level === "ERROR";
              const isWarn = log.level === "WARN";

              return (
                <div
                  key={log.id || index}
                  className={`group flex items-start gap-2.5 rounded-md px-2 py-1 transition ${
                    isErr
                      ? "bg-rose-950/40 text-rose-200 border-l-2 border-rose-500"
                      : isWarn
                      ? "bg-amber-950/40 text-amber-200 border-l-2 border-amber-500"
                      : "text-slate-300 hover:bg-slate-900/80"
                  }`}
                >
                  <span className="shrink-0 text-[10px] text-slate-500">
                    {log.timestamp}
                  </span>

                  <span
                    className={`shrink-0 rounded px-1 text-[9px] font-bold ${
                      isErr
                        ? "bg-rose-500/20 text-rose-400"
                        : isWarn
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {log.level}
                  </span>

                  {log.service_id && (
                    <span className="shrink-0 rounded bg-slate-800 px-1 text-[9px] font-semibold text-slate-400">
                      {log.service_id}
                    </span>
                  )}

                  <span className="break-all">{log.message}</span>
                </div>
              );
            })}
            <div ref={logEndRef} />
          </div>
        )}
      </div>

      {/* Footer Status */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-[#f8fafc] px-4 py-2.5 text-[10px] font-mono text-slate-500">
        <div className="flex items-center gap-3">
          <span>Buffered: {logs.length} events</span>
          <span>Showing: {filteredLogs.length} events</span>
        </div>
        <button
          type="button"
          onClick={handleExportLogs}
          className="flex items-center gap-1 text-red-600 font-bold hover:text-red-700 transition"
        >
          <Download className="h-3 w-3" /> Export JSON
        </button>
      </div>
    </div>
  );
}
export default LogConsole;
