"use client";

import React, { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Clock3, Filter } from "lucide-react";
import { PerformanceDataPoint } from "@/types";

interface PerformanceChartProps {
  data: PerformanceDataPoint[];
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  const [activeMetric, setActiveMetric] = useState<"latency" | "errors" | "both">("both");

  return (
    <div className="panel flex flex-col p-5">
      {/* Chart Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-cyan-400">
              <Activity className="h-4 w-4" />
            </span>
            <h2 className="text-sm font-bold text-white">
              Cluster Performance & Latency Waveform
            </h2>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Real-time P95 latency (ms) and error distribution over rolling telemetry windows
          </p>
        </div>

        {/* Metric Switcher */}
        <div className="flex rounded-xl border border-slate-800 bg-slate-950 p-1">
          <button
            type="button"
            onClick={() => setActiveMetric("both")}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
              activeMetric === "both"
                ? "bg-slate-800 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Combined
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric("latency")}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
              activeMetric === "latency"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Latency (ms)
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric("errors")}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
              activeMetric === "errors"
                ? "bg-rose-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Errors
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="mt-5 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="errorsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                return (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-3 shadow-xl backdrop-blur-xl">
                    <p className="font-mono text-[10px] font-bold text-slate-400">{label}</p>
                    <div className="mt-2 space-y-1">
                      {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-xs font-mono">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-slate-300 capitalize">{entry.name}:</span>
                          <span className="font-bold text-white">
                            {entry.value}
                            {entry.name === "latency" ? "ms" : " err"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }}
            />

            {(activeMetric === "both" || activeMetric === "latency") && (
              <Area
                type="monotone"
                dataKey="latency"
                name="latency"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#latencyGradient)"
              />
            )}

            {(activeMetric === "both" || activeMetric === "errors") && (
              <Area
                type="monotone"
                dataKey="errors"
                name="errors"
                stroke="#f43f5e"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#errorsGradient)"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Summary */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-3 text-[11px] text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span>P95 Latency</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span>Error Volume</span>
          </div>
        </div>

        <span className="font-mono text-cyan-400">Sampling: 5s streaming interval</span>
      </div>
    </div>
  );
}
export default PerformanceChart;
