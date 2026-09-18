"use client";

import React, { useState } from "react";
import { AlertTriangle, Flame, Info } from "lucide-react";
import { AnomalyHeatmapDay } from "@/types";

interface AnomalyHeatmapProps {
  data: AnomalyHeatmapDay[];
}

export function AnomalyHeatmap({ data }: AnomalyHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{
    day: string;
    hour: number;
    count: number;
  } | null>(null);

  // Helper for heatmap cell color
  const getCellColor = (val: number) => {
    if (val === 0) return "bg-slate-900 border border-slate-800/60";
    if (val <= 2) return "bg-blue-900/40 border border-blue-700/40 text-blue-300";
    if (val <= 5) return "bg-amber-700/50 border border-amber-600/50 text-amber-200";
    if (val <= 8) return "bg-orange-600/70 border border-orange-500/70 text-orange-100";
    return "bg-rose-600 border border-rose-500 text-white shadow-md shadow-rose-600/30";
  };

  return (
    <div className="panel p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400">
            <Flame className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Cluster Anomaly Heatmap</h2>
            <p className="text-[10px] text-slate-500">
              7-Day hourly anomaly density across all microservices
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
          <span>Low</span>
          <div className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-slate-900 border border-slate-800" />
            <span className="h-3 w-3 rounded bg-blue-900/50" />
            <span className="h-3 w-3 rounded bg-amber-600/60" />
            <span className="h-3 w-3 rounded bg-rose-600" />
          </div>
          <span>Critical</span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="mt-5 overflow-x-auto">
        <div className="min-w-[580px]">
          {/* Hour labels */}
          <div className="flex items-center text-[9px] font-mono text-slate-500 pl-10 pb-1.5 justify-between">
            <span>00:00</span>
            <span>04:00</span>
            <span>08:00</span>
            <span>12:00</span>
            <span>16:00</span>
            <span>20:00</span>
            <span>23:00</span>
          </div>

          <div className="space-y-2">
            {data.map((dayItem) => (
              <div key={dayItem.day} className="flex items-center gap-2">
                <span className="w-8 font-mono text-xs font-bold text-slate-400 text-right">
                  {dayItem.day}
                </span>

                <div className="grid flex-1 grid-cols-24 gap-1">
                  {dayItem.hours.map((val, hourIndex) => (
                    <div
                      key={hourIndex}
                      onMouseEnter={() =>
                        setHoveredCell({ day: dayItem.day, hour: hourIndex, count: val })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`h-6 rounded cursor-pointer transition-all duration-150 hover:scale-110 ${getCellColor(
                        val
                      )}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hover Info Tooltip bar */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 text-[11px] text-slate-400">
        {hoveredCell ? (
          <span className="font-mono text-cyan-300">
            {hoveredCell.day} at {String(hoveredCell.hour).padStart(2, "0")}:00 -{" "}
            <strong>{hoveredCell.count} anomalies detected</strong>
          </span>
        ) : (
          <span className="text-slate-500">Hover over any hour cell for detailed count</span>
        )}
        <span className="font-mono text-xs text-slate-500">Peak Window: Thursday 14:00 - 18:00</span>
      </div>
    </div>
  );
}
export default AnomalyHeatmap;
