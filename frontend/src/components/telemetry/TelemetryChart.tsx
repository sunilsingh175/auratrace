"use client";

import React from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Radio } from "lucide-react";
import { PerformanceDataPoint } from "@/types";

interface TelemetryChartProps {
  data: PerformanceDataPoint[];
}

export function TelemetryChart({ data }: TelemetryChartProps) {
  const current = data.length ? data[data.length - 1] : null;

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
            <Radio className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Live Ingestion Waveform</h2>
            <p className="text-[10px] text-slate-500">Verified 5-second telemetry buckets from PostgreSQL</p>
          </div>
        </div>
        <span className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-[10px] font-mono font-bold text-slate-300">
          {current ? `${current.requests.toLocaleString()} req / bucket` : "No data"}
        </span>
      </div>

      <div className="mt-4 h-48 w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-500">No telemetry data in the current window.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="telemetryStreamGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0]?.payload as PerformanceDataPoint;
                  return (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/95 p-2.5 shadow-xl">
                      <p className="font-mono text-[10px] font-bold text-slate-400">{label}</p>
                      <p className="mt-1 font-mono text-xs text-cyan-400">{point.requests.toLocaleString()} requests</p>
                      <p className="font-mono text-xs text-slate-300">P95 {point.latency.toFixed(2)} ms</p>
                      <p className="font-mono text-xs text-slate-400">Errors {point.errors}</p>
                    </div>
                  );
                }}
              />
              <Area type="monotone" dataKey="requests" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#telemetryStreamGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default TelemetryChart;
