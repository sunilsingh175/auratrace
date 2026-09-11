"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, RefreshCw, Search, ShieldAlert, Sparkles } from "lucide-react";
import { useIncidents } from "@/hooks/use-incidents";
import { formatTimeAgo } from "@/lib/utils";

const filters = ["ALL", "OPEN", "INVESTIGATING", "RESOLVED"];

export default function IncidentsPage() {
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const { incidents, refresh } = useIncidents(5000);

  const filtered = useMemo(() => incidents.filter((inc) => {
    if (selectedStatus !== "ALL" && inc.status !== selectedStatus) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return [inc.error_type, inc.service_id, inc.ai_root_cause, inc.raw_stack_trace].some((v) => v?.toLowerCase().includes(q));
  }), [incidents, selectedStatus, searchQuery]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label">Operations</p>
          <h1 className="mt-1 flex items-center gap-2.5 text-2xl font-bold tracking-tight text-white"><ShieldAlert className="h-6 w-6 text-rose-400" /> Incident Intelligence</h1>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">Review anomaly events, AI diagnostic results, root-cause analysis and recovery recommendations.</p>
        </div>
        <button onClick={() => refresh()} className="button-secondary self-start sm:self-auto"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
      </div>

      <div className="panel p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/50 p-1">
            {filters.map((st) => <button key={st} onClick={() => setSelectedStatus(st)} className={`rounded-md px-3 py-1.5 text-[10px] font-semibold transition ${selectedStatus === st ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-200"}`}>{st}</button>)}
          </div>
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search incidents..." className="field pl-9" />
          </div>
        </div>
      </div>

      <section className="panel overflow-hidden">
        <div className="panel-header"><div><h2 className="text-sm font-bold text-white">Incident reports</h2><p className="text-[10px] text-slate-500">{filtered.length} matching records</p></div><span className="text-[10px] font-mono text-slate-500">Auto-refresh 5s</span></div>
        <div className="divide-y divide-slate-800/80">
          {filtered.length === 0 ? <div className="py-16 text-center"><CheckCircle2 className="mx-auto h-9 w-9 text-emerald-400/50" /><p className="mt-3 text-sm font-semibold text-slate-300">No matching incidents</p><p className="mt-1 text-xs text-slate-600">Adjust the status filter or search query.</p></div> : filtered.map((incident) => {
            const score = Math.round(incident.anomaly_score * 100);
            const statusClass = incident.status === "OPEN" ? "status-open" : incident.status === "INVESTIGATING" ? "status-investigating" : "status-resolved";
            return <article key={incident.id} className="p-4 transition hover:bg-slate-800/25 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase ${statusClass}`}>{incident.status}</span>
                    <span className="font-mono text-[10px] font-semibold text-blue-300">[{incident.service_id}]</span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-600"><Clock3 className="h-3 w-3" />{formatTimeAgo(incident.created_at)}</span>
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-slate-200">{incident.error_type || "Unclassified anomaly"}</h3>
                  <p className="mt-1 line-clamp-2 max-w-4xl text-xs leading-5 text-slate-500">{incident.ai_root_cause || incident.raw_stack_trace || "No diagnostic summary available."}</p>
                </div>
                <div className="flex items-center justify-between gap-5 lg:justify-end">
                  <div className="text-right"><span className="block text-[9px] uppercase tracking-wider text-slate-600">Anomaly score</span><span className={`font-mono text-lg font-bold ${score >= 80 ? "text-rose-400" : "text-amber-400"}`}>{score}%</span></div>
                  <Link href={`/incidents/${incident.id}`} className="button-secondary hover:!border-blue-500/40 hover:!text-blue-300"><Sparkles className="h-3.5 w-3.5" /> Diagnostics <ArrowRight className="h-3.5 w-3.5" /></Link>
                </div>
              </div>
            </article>;
          })}
        </div>
      </section>
    </div>
  );
}
