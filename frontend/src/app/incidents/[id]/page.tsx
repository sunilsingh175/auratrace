"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Check, CheckCircle2, Clock3, Copy, ShieldAlert, Sparkles, Terminal } from "lucide-react";
import { CodeDiffViewer } from "@/components/code-diff-viewer";
import { Incident, fetchIncidentById, updateIncidentStatus } from "@/lib/api-client";
import { formatTimeAgo } from "@/lib/utils";

export default function IncidentDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { if (id) fetchIncidentById(id).then((data) => { setIncident(data); setLoading(false); }); }, [id]);

  const changeStatus = async (status: Incident["status"]) => {
    if (!incident) return;
    setUpdating(true);
    const updated = await updateIncidentStatus(incident.id, status);
    if (updated) setIncident(updated);
    setUpdating(false);
  };

  const copyTrace = async () => {
    if (!incident?.raw_stack_trace) return;
    await navigator.clipboard.writeText(incident.raw_stack_trace);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-center"><div><Sparkles className="mx-auto h-7 w-7 animate-pulse text-blue-400" /><p className="mt-3 text-xs text-slate-500">Loading incident details...</p></div></div>;
  if (!incident) return <div className="mx-auto max-w-xl py-20 text-center"><AlertCircle className="mx-auto h-10 w-10 text-rose-400" /><h1 className="mt-3 text-lg font-bold text-white">Incident not found</h1><p className="mt-1 text-xs text-slate-500">The incident could not be retrieved from the AuraTrace API.</p><Link href="/incidents" className="button-secondary mt-4"><ArrowLeft className="h-3.5 w-3.5" /> Back to incidents</Link></div>;

  const score = Math.round(incident.anomaly_score * 100);
  const statusClass = incident.status === "OPEN" ? "status-open" : incident.status === "INVESTIGATING" ? "status-investigating" : "status-resolved";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/incidents" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to incidents</Link>
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 p-1">
          <span className="px-2 text-[10px] font-semibold text-slate-500">Status</span>
          {(["OPEN", "INVESTIGATING", "RESOLVED"] as const).map((st) => <button key={st} disabled={updating} onClick={() => changeStatus(st)} className={`rounded-md px-2.5 py-1.5 text-[9px] font-bold transition ${incident.status === st ? st === "OPEN" ? "bg-rose-500 text-white" : st === "INVESTIGATING" ? "bg-amber-500 text-slate-950" : "bg-emerald-500 text-white" : "text-slate-500 hover:text-slate-200"}`}>{st}</button>)}
        </div>
      </div>

      <section className="panel overflow-hidden">
        <div className="panel-header"><div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-rose-400" /><span className="text-xs font-semibold text-slate-300">Incident overview</span></div><span className="font-mono text-[9px] text-slate-600">ID {incident.id}</span></div>
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-1 font-mono text-[10px] font-semibold text-blue-300">{incident.service_id}</span>
                <span className={`rounded-md px-2 py-1 text-[9px] font-bold uppercase ${statusClass}`}>{incident.status}</span>
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-600"><Clock3 className="h-3 w-3" /> {formatTimeAgo(incident.created_at)}</span>
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">{incident.error_type || "System anomaly incident"}</h1>
              <p className="mt-1 text-xs text-slate-500">Created {new Date(incident.created_at).toLocaleString()}</p>
            </div>
            <div className="shrink-0 rounded-xl border border-slate-700 bg-slate-950/70 px-5 py-4 text-center">
              <span className="label block">Anomaly score</span>
              <span className={`mt-1 block font-mono text-3xl font-bold ${score >= 80 ? "text-rose-400" : "text-amber-400"}`}>{score}%</span>
              <span className="text-[9px] text-slate-600">Outlier confidence</span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 sm:p-6">
        <div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400"><Sparkles className="h-4 w-4" /></span><div><h2 className="text-sm font-bold text-white">AI Doctor diagnosis</h2><p className="text-[10px] text-slate-500">RAG-assisted root-cause synthesis</p></div></div>
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/65 p-4 text-xs leading-6 text-slate-300 whitespace-pre-line">{incident.ai_root_cause || "Diagnosis is not available yet."}</div>
      </section>

      {incident.ai_suggested_patch && <CodeDiffViewer diffText={incident.ai_suggested_patch} title="Recommended recovery patch" />}

      <section className="panel overflow-hidden">
        <div className="panel-header"><div className="flex items-center gap-2"><Terminal className="h-4 w-4 text-slate-500" /><div><h2 className="text-sm font-bold text-white">Raw stack trace</h2><p className="text-[10px] text-slate-500">Original telemetry context</p></div></div><button onClick={copyTrace} disabled={!incident.raw_stack_trace} className="button-secondary !px-2.5 !py-1.5">{copied ? <><Check className="h-3.5 w-3.5 text-emerald-400" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy trace</>}</button></div>
        <pre className="overflow-x-auto bg-slate-950 p-4 font-mono text-[10px] leading-5 text-rose-300/80">{incident.raw_stack_trace || "No stack trace attached."}</pre>
      </section>

      <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3 text-[10px] text-slate-500"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Incident is persisted in PostgreSQL and available through the incident API.</div>
    </div>
  );
}
