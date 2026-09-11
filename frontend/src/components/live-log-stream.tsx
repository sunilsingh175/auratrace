"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Pause, Play, Search, Terminal, Trash2 } from "lucide-react";
import { LogEvent } from "@/hooks/use-websocket";

export function LiveLogStream({ logs, onClear, isConnected }: { logs: LogEvent[]; onClear: () => void; isConnected: boolean }) {
  const [filterLevel, setFilterLevel] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== "ALL" && log.level !== filterLevel) return false;
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return [log.message, log.service_id, log.error_type, log.stack_trace, log.raw_stack_trace].some((v) => v?.toLowerCase().includes(q));
  });

  const levelClass = (level: string) => ({
    CRITICAL: "border-purple-500/30 bg-purple-500/10 text-purple-300",
    ERROR: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    WARN: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    INFO: "border-blue-500/30 bg-blue-500/10 text-blue-300",
    DEBUG: "border-slate-700 bg-slate-800 text-slate-400",
  }[level] || "border-slate-700 bg-slate-800 text-slate-400");

  return (
    <section className="panel flex h-[520px] min-h-0 flex-col overflow-hidden">
      <div className="panel-header flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400"><Terminal className="h-4 w-4" /></span>
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">Live Telemetry Log Stream <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-400" : "bg-rose-400"}`} /></h2>
            <p className="mt-0.5 text-[10px] text-slate-500">Buffered {logs.length} events · Showing {filteredLogs.length}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search logs..." className="field w-44 pl-8 sm:w-56" />
          </div>
          <div className="flex items-center rounded-lg border border-slate-700 bg-slate-950/60 p-1">
            {["ALL", "INFO", "WARN", "ERROR", "CRITICAL"].map((lvl) => (
              <button key={lvl} onClick={() => setFilterLevel(lvl)} className={`rounded-md px-2 py-1 text-[9px] font-semibold tracking-wide transition ${filterLevel === lvl ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-200"}`}>{lvl}</button>
            ))}
          </div>
          <button onClick={() => setIsPaused((v) => !v)} title={isPaused ? "Resume stream" : "Pause stream"} className={isPaused ? "button-primary !bg-amber-500 !text-slate-950 !px-2.5" : "button-secondary !px-2.5"}>{isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}</button>
          <button onClick={onClear} title="Clear buffer" className="button-secondary !px-2.5 hover:!text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-950/80 p-2">
        {filteredLogs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-600"><Terminal className="h-4 w-4" /></span>
            <p className="mt-3 text-xs font-medium text-slate-400">Listening for incoming telemetry events...</p>
            <p className="mt-1 max-w-sm text-[10px] text-slate-600">Run your SDK or telemetry simulator to stream logs here.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log, index) => {
              const expanded = expandedIndex === index;
              const trace = log.stack_trace || log.raw_stack_trace;
              const details = Boolean(trace || log.metadata);
              return (
                <div key={`${log.timestamp}-${index}`} onClick={() => details && setExpandedIndex(expanded ? null : index)} className={`rounded-md border px-2.5 py-2 transition hover:border-slate-700 ${log.level === "ERROR" || log.level === "CRITICAL" ? "border-rose-500/15 bg-rose-500/5" : "border-slate-800 bg-slate-900/30"} ${details ? "cursor-pointer" : ""}`}>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="shrink-0 font-mono text-slate-600">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "--:--:--"}</span>
                    <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-bold ${levelClass(log.level)}`}>{log.level}</span>
                    <span className="shrink-0 font-semibold text-blue-300">[{log.service_id}]</span>
                    {typeof log.latency_ms === "number" && log.latency_ms > 0 && <span className="shrink-0 font-mono text-slate-600">{log.latency_ms.toFixed(1)}ms</span>}
                    <span className="min-w-0 flex-1 truncate text-slate-300">{log.error_type && <span className="mr-1.5 font-semibold text-rose-300">[{log.error_type}]</span>}{log.message || log.log_message || "Telemetry event"}</span>
                    {details && (expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-blue-400" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-600" />)}
                  </div>
                  {expanded && (
                    <div className="mt-2 rounded-md border border-slate-800 bg-slate-950 p-2.5 text-[10px] text-slate-400">
                      {trace && <pre className="whitespace-pre-wrap font-mono leading-5 text-rose-300/80">{trace}</pre>}
                      {log.metadata && <pre className="mt-2 whitespace-pre-wrap font-mono leading-5 text-slate-500">{JSON.stringify(log.metadata, null, 2)}</pre>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
