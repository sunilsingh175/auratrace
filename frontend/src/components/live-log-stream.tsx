"use client";

import React, { useState, useRef, useEffect } from "react";
import { Terminal, Search, Trash2, Pause, Play, ChevronRight, ChevronDown, Filter } from "lucide-react";
import { LogEvent } from "@/hooks/use-websocket";

interface LiveLogStreamProps {
  logs: LogEvent[];
  onClear: () => void;
  isConnected: boolean;
}

export function LiveLogStream({ logs, onClear, isConnected }: LiveLogStreamProps) {
  const [filterLevel, setFilterLevel] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== "ALL" && log.level !== filterLevel) return false;
    if (searchTerm) {
      const matchSearch =
        (log.message && log.message.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.service_id && log.service_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.error_type && log.error_type.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchSearch) return false;
    }
    return true;
  });

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return "bg-purple-950/80 text-purple-300 border-purple-700/60 font-bold";
      case "ERROR":
        return "bg-rose-950/80 text-rose-300 border-rose-700/60 font-bold";
      case "WARN":
        return "bg-amber-950/80 text-amber-300 border-amber-700/60";
      case "DEBUG":
        return "bg-slate-800 text-slate-400 border-slate-700";
      case "INFO":
      default:
        return "bg-blue-950/70 text-blue-300 border-blue-700/50";
    }
  };

  return (
    <div className="bg-surface/90 border border-border rounded-xl shadow-2xl flex flex-col h-[520px] overflow-hidden">
      {/* Header Toolbar */}
      <div className="bg-surface-raised/80 border-b border-border px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              Live Telemetry Log Stream
              <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`} />
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Buffered {logs.length} events • Showing {filteredLogs.length}
            </p>
          </div>
        </div>

        {/* Filters & Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search logs, errors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-background/80 border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 w-44 sm:w-56"
            />
          </div>

          {/* Level Filter Dropdown */}
          <div className="flex items-center gap-1 bg-background/80 border border-border rounded-lg p-1">
            {["ALL", "INFO", "WARN", "ERROR", "CRITICAL"].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  filterLevel === lvl
                    ? "bg-cyan-500 text-slate-950 font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Pause / Clear Actions */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? "Resume auto-stream" : "Pause stream"}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              isPaused
                ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                : "bg-surface text-slate-400 border-border hover:text-slate-200"
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onClear}
            title="Clear buffer"
            className="p-1.5 rounded-lg border border-border bg-surface text-slate-400 hover:text-rose-400 hover:border-rose-500/50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Virtual Terminal Window */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1 bg-background/95 scrollbar-thin scrollbar-thumb-slate-800"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
            <Terminal className="w-8 h-8 mb-2 opacity-30 animate-pulse" />
            <p className="text-sm">Listening for incoming telemetry events...</p>
            <p className="text-xs text-slate-600 mt-1">Run chaos simulator or SDK client to stream logs.</p>
          </div>
        ) : (
          filteredLogs.map((log, index) => {
            const isExpanded = expandedIndex === index;
            const hasDetails = log.stack_trace || (log.metadata && Object.keys(log.metadata).length > 0);

            return (
              <div
                key={`${log.timestamp}-${index}`}
                onClick={() => hasDetails && setExpandedIndex(isExpanded ? null : index)}
                className={`rounded border transition-all duration-150 px-2.5 py-1.5 ${
                  log.level === "ERROR" || log.level === "CRITICAL"
                    ? "bg-rose-950/20 border-rose-900/30 hover:border-rose-700/60"
                    : "bg-surface/40 border-slate-800/60 hover:border-slate-700"
                } ${hasDetails ? "cursor-pointer" : ""}`}
              >
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {/* Timestamp */}
                  <span className="text-slate-500 text-[11px] shrink-0">
                    {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "--:--:--"}
                  </span>

                  {/* Level Pill */}
                  <span
                    className={`px-1.5 py-0.2 rounded border text-[10px] uppercase shrink-0 ${getLevelBadge(
                      log.level
                    )}`}
                  >
                    {log.level}
                  </span>

                  {/* Service ID */}
                  <span className="text-cyan-400 font-semibold shrink-0">[{log.service_id}]</span>

                  {/* Latency */}
                  {log.latency_ms > 0 && (
                    <span className="text-slate-400 text-[11px] shrink-0">
                      {log.latency_ms.toFixed(1)}ms
                    </span>
                  )}

                  {/* Message & Error Type */}
                  <span className="text-slate-200 truncate flex-1">
                    {log.error_type && (
                      <span className="text-rose-400 font-bold mr-1.5">[{log.error_type}]</span>
                    )}
                    {log.message || "Log telemetry event"}
                  </span>

                  {/* Expand icon */}
                  {hasDetails && (
                    <span className="text-slate-500 ml-auto shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </span>
                  )}
                </div>

                {/* Expanded Stack Trace Drawer */}
                {isExpanded && log.stack_trace && (
                  <div className="mt-2.5 p-3 rounded bg-slate-950/90 border border-slate-800 text-[11px] text-rose-300/90 overflow-x-auto whitespace-pre font-mono leading-relaxed">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 font-sans">
                      Captured Stack Trace:
                    </div>
                    {log.stack_trace}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
