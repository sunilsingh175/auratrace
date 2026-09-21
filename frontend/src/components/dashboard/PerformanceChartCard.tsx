"use client";

import React, { useState } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Activity, Clock3, AlertCircle } from "lucide-react";

interface DataPoint {
  time: string;
  latency: number;
  errors: number;
  requests?: number;
}

interface PerformanceChartCardProps {
  data: DataPoint[];
}

export function PerformanceChartCard({ data }: PerformanceChartCardProps) {
  const [viewMode, setViewMode] = useState<"combined" | "latency" | "errors">("combined");

  // If no data points yet, supply realistic baseline timeline points
  const chartData = data.length > 0 ? data : [
    { time: "12:00", latency: 0, errors: 0, requests: 0 },
    { time: "12:05", latency: 0, errors: 0, requests: 0 },
    { time: "12:10", latency: 0, errors: 0, requests: 0 },
    { time: "12:15", latency: 0, errors: 0, requests: 0 },
    { time: "12:20", latency: 0, errors: 0, requests: 0 },
    { time: "12:25", latency: 0, errors: 0, requests: 0 },
  ];

  return (
    <div className="panel p-6 bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
      {/* Header with Title, Subtitle, and Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5 mb-6">
        <div>
          <h2 className="font-heading font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight">
            Cluster Performance & Latency Waveform
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-sans mt-0.5">
            Real-time P95 latency (ms) and error distribution over rolling telemetry windows
          </p>
        </div>

        {/* View Mode Toggle Controls */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 p-1 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("combined")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition font-heading cursor-pointer ${
              viewMode === "combined"
                ? "bg-white text-slate-900 shadow-sm border border-slate-100"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Combined
          </button>
          <button
            type="button"
            onClick={() => setViewMode("latency")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition font-heading cursor-pointer ${
              viewMode === "latency"
                ? "bg-white text-[#dc2626] shadow-sm border border-slate-100"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Latency (ms)
          </button>
          <button
            type="button"
            onClick={() => setViewMode("errors")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition font-heading cursor-pointer ${
              viewMode === "errors"
                ? "bg-white text-amber-600 shadow-sm border border-slate-100"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Errors
          </button>
        </div>
      </div>

      {/* Chart Visualization */}
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === "combined" ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="errorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "Lato" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "Lato" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid #f1f5f9",
                  boxShadow: "0 4px 20px -4px rgba(0,0,0,0.08)",
                  fontFamily: "Lato",
                  fontSize: "12px",
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: "12px", fontSize: "11px", fontFamily: "Lato" }}
              />
              <Area
                type="monotone"
                dataKey="latency"
                name="P95 Latency (ms)"
                stroke="#dc2626"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#latencyGradient)"
              />
              <Area
                type="monotone"
                dataKey="errors"
                name="Error Count"
                stroke="#f59e0b"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#errorGradient)"
              />
            </AreaChart>
          ) : viewMode === "latency" ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="latencyOnlyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "Lato" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "Lato" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid #f1f5f9",
                  boxShadow: "0 4px 20px -4px rgba(0,0,0,0.08)",
                  fontFamily: "Lato",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="latency"
                name="P95 Latency (ms)"
                stroke="#dc2626"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#latencyOnlyGradient)"
              />
            </AreaChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "Lato" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "Lato" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid #f1f5f9",
                  boxShadow: "0 4px 20px -4px rgba(0,0,0,0.08)",
                  fontFamily: "Lato",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="errors"
                name="Errors"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ fill: "#f59e0b", r: 4 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4 text-xs text-slate-400 font-sans">
        <span className="flex items-center gap-1.5">
          <Clock3 className="h-3.5 w-3.5 text-slate-400" />
          <span>Sampling: 5s streaming interval</span>
        </span>
        <span className="font-mono text-[11px] text-slate-400">
          Telemetry Rolling Window
        </span>
      </div>
    </div>
  );
}
