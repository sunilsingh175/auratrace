"use client";

import React from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Clock, AlertTriangle, Activity } from "lucide-react";

interface DashboardChartsProps {
  latencyData?: Array<{ time: string; value: number }>;
  errorData?: Array<{ time: string; value: number }>;
  volumeData?: Array<{ time: string; value: number }>;
}

export function DashboardCharts({
  latencyData,
  errorData,
  volumeData,
}: DashboardChartsProps) {
  // Default mock timeseries aligned with screenshot time points if live buffer is small
  const defaultLatency = [
    { time: "12:40", value: 240 },
    { time: "12:41", value: 430 },
    { time: "12:42", value: 310 },
    { time: "12:43", value: 480 },
    { time: "12:44", value: 390 },
    { time: "12:45", value: 510 },
  ];

  const defaultErrors = [
    { time: "12:40", value: 16 },
    { time: "12:41", value: 8 },
    { time: "12:42", value: 12 },
    { time: "12:43", value: 28 },
    { time: "12:44", value: 14 },
    { time: "12:45", value: 6 },
  ];

  const defaultVolume = [
    { time: "12:40", value: 2200 },
    { time: "12:41", value: 2600 },
    { time: "12:42", value: 2400 },
    { time: "12:43", value: 3400 },
    { time: "12:44", value: 3100 },
    { time: "12:45", value: 3800 },
  ];

  const activeLatency = latencyData && latencyData.length > 2 ? latencyData : defaultLatency;
  const activeErrors = errorData && errorData.length > 2 ? errorData : defaultErrors;
  const activeVolume = volumeData && volumeData.length > 2 ? volumeData : defaultVolume;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Chart 1: Request Latency */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="font-heading font-bold text-slate-900 text-sm">
              Request Latency
            </h3>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 text-[11px] font-semibold border border-red-100">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span>Live</span>
          </div>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activeLatency} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="latencyAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={[0, 1000]}
                ticks={[0, 250, 500, 750, 1000]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderColor: "#f1f5f9",
                  borderRadius: "12px",
                  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.08)",
                  fontSize: "11px",
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#dc2626"
                strokeWidth={2.2}
                fill="url(#latencyAreaGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Error Frequency */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-slate-500" />
            <h3 className="font-heading font-bold text-slate-900 text-sm">
              Error Frequency
            </h3>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 text-[11px] font-semibold border border-red-100">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span>Live</span>
          </div>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activeErrors} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={[0, 40]}
                ticks={[0, 10, 20, 30, 40]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderColor: "#f1f5f9",
                  borderRadius: "12px",
                  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.08)",
                  fontSize: "11px",
                }}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 3: Request Volume */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-500" />
            <h3 className="font-heading font-bold text-slate-900 text-sm">
              Request Volume
            </h3>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 text-[11px] font-semibold border border-red-100">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span>Live</span>
          </div>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activeVolume} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="volumeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={[0, 4000]}
                ticks={[0, 1000, 2000, 3000, 4000]}
                tickFormatter={(v) => (v === 0 ? "0" : `${v / 1000}k`)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderColor: "#f1f5f9",
                  borderRadius: "12px",
                  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.08)",
                  fontSize: "11px",
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#9333ea"
                strokeWidth={2.2}
                fill="url(#volumeAreaGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
