"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShieldAlert, Sparkles, ArrowRight, Search, Filter, RefreshCw, CheckCircle2, Clock } from "lucide-react";
import { useIncidents } from "@/hooks/use-incidents";
import { formatTimeAgo } from "@/lib/utils";

export default function IncidentsPage() {
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { incidents, loading, refresh } = useIncidents(5000);

  const filteredIncidents = incidents.filter((inc) => {
    if (selectedStatus !== "ALL" && inc.status !== selectedStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        (inc.error_type && inc.error_type.toLowerCase().includes(q)) ||
        (inc.service_id && inc.service_id.toLowerCase().includes(q)) ||
        (inc.ai_root_cause && inc.ai_root_cause.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            Incident Intelligence Hub
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time anomaly reports, root-cause syntheses, and self-healing recommendations.
          </p>
        </div>

        <button
          onClick={() => refresh()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-slate-800 text-xs text-slate-300 transition-colors self-start sm:self-auto shadow"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface/80 border border-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-background/80 border border-border rounded-lg p-1">
          {["ALL", "OPEN", "INVESTIGATING", "RESOLVED"].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                selectedStatus === st
                  ? "bg-rose-500 text-white font-semibold shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search error types, services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background/80 border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500/80"
          />
        </div>
      </div>

      {/* Incident Reports Table / Card View */}
      <div className="bg-surface/90 border border-border rounded-xl overflow-hidden shadow-2xl">
        <div className="divide-y divide-border">
          {filteredIncidents.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400/40" />
              <p className="text-base font-semibold text-slate-300">No matching incidents found</p>
              <p className="text-xs text-slate-500 mt-1">Try selecting a different status filter or clear search.</p>
            </div>
          ) : (
            filteredIncidents.map((incident) => {
              const scorePct = Math.round(incident.anomaly_score * 100);

              return (
                <div
                  key={incident.id}
                  className="p-4 sm:p-5 hover:bg-surface-raised/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {/* Status Tag */}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          incident.status === "OPEN"
                            ? "bg-rose-950 text-rose-300 border border-rose-800/80"
                            : incident.status === "INVESTIGATING"
                            ? "bg-amber-950 text-amber-300 border border-amber-800/80"
                            : "bg-emerald-950 text-emerald-300 border border-emerald-800/80"
                        }`}
                      >
                        {incident.status}
                      </span>

                      {/* Service tag */}
                      <span className="text-xs font-mono text-cyan-400 font-semibold">
                        [{incident.service_id}]
                      </span>

                      {/* Created Time */}
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(incident.created_at)}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {incident.error_type || "Unclassified Anomaly"}
                    </h3>

                    {/* AI Diagnosis Snippet */}
                    {incident.ai_root_cause && (
                      <p className="text-xs text-slate-400 line-clamp-2 max-w-3xl">
                        {incident.ai_root_cause.replace(/\*\*/g, "")}
                      </p>
                    )}
                  </div>

                  {/* Actions & Score */}
                  <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-border/40">
                    <div className="text-right">
                      <span className="text-xs text-slate-500 block">Anomaly Score</span>
                      <span
                        className={`text-base font-mono font-bold ${
                          scorePct >= 80 ? "text-rose-400" : "text-amber-400"
                        }`}
                      >
                        {scorePct}%
                      </span>
                    </div>

                    <Link
                      href={`/incidents/${incident.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500 hover:text-slate-950 text-cyan-400 font-semibold text-xs border border-cyan-500/30 transition-all shadow"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Diagnostics
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
