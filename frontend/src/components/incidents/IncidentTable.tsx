"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Filter,
  Search,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  Activity,
  Layers,
} from "lucide-react";
import { Incident } from "@/types";
import { SeverityBadge } from "./SeverityBadge";
import { formatTimeAgo } from "@/lib/utils";

interface IncidentTableProps {
  incidents: Incident[];
  onRefresh?: () => void;
}

export function IncidentTable({ incidents, onRefresh }: IncidentTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = incidents.filter((inc) => {
    if (statusFilter !== "ALL" && inc.status !== statusFilter) return false;
    if (severityFilter !== "ALL" && inc.severity !== severityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        inc.id.toLowerCase().includes(q) ||
        inc.service_id.toLowerCase().includes(q) ||
        inc.title.toLowerCase().includes(q) ||
        inc.error_type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="panel overflow-hidden">
      {/* Table Controls */}
      <div className="flex flex-col gap-3 border-b border-slate-800/80 p-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(["ALL", "OPEN", "INVESTIGATING", "RESOLVED"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                statusFilter === st
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "bg-slate-950/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              {st === "ALL" ? "All Incidents" : st}
            </button>
          ))}
        </div>

        {/* Search & Severity Filter */}
        <div className="flex items-center gap-2">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-300 outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search incidents..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 py-1.5 pl-8.5 pr-3 text-xs text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Layers className="h-10 w-10 text-slate-700" />
            <p className="mt-3 text-sm font-bold text-slate-300">No matching incidents</p>
            <p className="text-xs text-slate-500">No anomaly records matching the current filter parameters.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800/80 bg-slate-950/40 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Incident</th>
                <th className="px-5 py-3.5">Service</th>
                <th className="px-5 py-3.5">Severity</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Outlier Score</th>
                <th className="px-5 py-3.5">Detected</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((inc) => {
                const scorePct = Math.round(inc.anomaly_score * 100);
                const isCritical = scorePct >= 80;

                return (
                  <tr
                    key={inc.id}
                    className="group transition hover:bg-slate-800/30"
                  >
                    {/* Title & Type */}
                    <td className="px-5 py-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-400">
                            {inc.id}
                          </span>
                          <span className="font-bold text-white group-hover:text-cyan-300 transition">
                            {inc.title || inc.error_type}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400 max-w-md">
                          {inc.error_type}
                        </p>
                      </div>
                    </td>

                    {/* Service */}
                    <td className="px-5 py-4 font-mono font-semibold text-cyan-300">
                      {inc.service_id}
                    </td>

                    {/* Severity */}
                    <td className="px-5 py-4">
                      <SeverityBadge severity={inc.severity} />
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <SeverityBadge status={inc.status} />
                    </td>

                    {/* Outlier Score */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono text-sm font-extrabold ${
                            isCritical ? "text-rose-400" : "text-amber-400"
                          }`}
                        >
                          {scorePct}%
                        </span>
                        <div className="h-1.5 w-12 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isCritical ? "bg-rose-500" : "bg-amber-500"
                            }`}
                            style={{ width: `${scorePct}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Time */}
                    <td className="px-5 py-4 text-[11px] text-slate-400">
                      {formatTimeAgo(inc.created_at)}
                    </td>

                    {/* Action */}
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/incidents/${inc.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-cyan-300 transition hover:bg-blue-500/20"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Diagnose</span>
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-800/80 bg-slate-950/40 px-5 py-3 text-[11px] text-slate-500">
        <span>Showing {filtered.length} of {incidents.length} anomalies</span>
        <span className="font-mono text-cyan-400">RAG Vector Store Indexed</span>
      </div>
    </div>
  );
}
export default IncidentTable;
