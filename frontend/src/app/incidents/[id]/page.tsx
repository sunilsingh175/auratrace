"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Cpu,
  Database,
  FileCode2,
  RefreshCw,
  Server,
  ShieldAlert,
  Sparkles,
  Terminal,
  Activity,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SeverityBadge } from "@/components/incidents/SeverityBadge";
import { AIAnalysis } from "@/components/incidents/AIAnalysis";
import { CodeDiffViewer } from "@/components/code-diff-viewer";
import { fetchIncidentById, updateIncidentStatus, regenerateIncidentDiagnosis } from "@/lib/api-client";
import { Incident } from "@/types";
import { formatTimeAgo } from "@/lib/utils";

export default function IncidentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "INC-1024";

  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    fetchIncidentById(id).then((data) => {
      setIncident(data);
      setLoading(false);
    });
  }, [id]);

  const handleResolve = async () => {
    if (!incident) return;
    const updated = await updateIncidentStatus(incident.id, "RESOLVED");
    if (updated) {
      setIncident(updated);
    }
  };

  const handleRegenerate = async () => {
    if (!incident) return;
    setIsRegenerating(true);
    const updated = await regenerateIncidentDiagnosis(incident.id);
    if (updated) {
      setIncident(updated);
    }
    setTimeout(() => setIsRegenerating(false), 800);
  };

  if (loading) {
    return (
      <AppShell title="Incident AI Diagnosis">
        <div className="panel flex h-96 flex-col items-center justify-center p-12 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
          <p className="mt-4 font-mono text-xs text-slate-400">Loading incident telemetry & RAG vector context...</p>
        </div>
      </AppShell>
    );
  }

  if (!incident) {
    return (
      <AppShell title="Incident Not Found">
        <div className="panel p-12 text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-rose-500" />
          <h2 className="mt-3 text-lg font-bold text-white">Incident Not Found</h2>
          <p className="mt-1 text-xs text-slate-500">The incident ID '{id}' could not be located in the database.</p>
          <Link href="/incidents" className="button-primary mt-6">
            <ArrowLeft className="h-4 w-4" /> Return to Incidents
          </Link>
        </div>
      </AppShell>
    );
  }

  const scorePct = Math.round(incident.anomaly_score * 100);
  const metrics = incident.system_metrics || {
    cpu_percent: 74,
    memory_percent: 88,
    latency_ms: 2840,
    error_rate_per_min: 34,
  };

  return (
    <AppShell
      title={`Incident Diagnosis: ${incident.id}`}
      subtitle="Flagship Telemetry → ML Anomaly → pgvector RAG → Gemini AI Code Remediation"
    >
      <div className="space-y-6">
        {/* Back Link & Action Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/incidents"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Incident Intelligence Hub</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs text-slate-400">
              Detected: {formatTimeAgo(incident.created_at)}
            </span>
          </div>
        </div>

        {/* Incident Summary Hero Card */}
        <div className="panel relative overflow-hidden p-6 border-slate-800">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-sm font-extrabold text-blue-400">
                  #{incident.id}
                </span>
                <SeverityBadge severity={incident.severity} />
                <SeverityBadge status={incident.status} />
                <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-cyan-300">
                  {incident.service_id}
                </span>
              </div>

              <h1 className="text-xl font-extrabold tracking-tight text-white md:text-2xl">
                {incident.title || incident.error_type}
              </h1>

              <p className="font-mono text-xs text-rose-300">
                Exception Class: {incident.error_type}
              </p>
            </div>

            {/* Anomaly Outlier Score Gauge */}
            <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shrink-0">
              <div className="text-right">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Isolation Forest Score
                </span>
                <span className="font-mono text-2xl font-extrabold text-rose-400">
                  {scorePct}% Outlier
                </span>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30">
                <ShieldAlert className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Main Diagnosis Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Stack Trace & System Telemetry Metrics (col-span-6) */}
          <div className="space-y-6 lg:col-span-6">
            {/* Live Stack Trace Viewer */}
            <div className="panel overflow-hidden">
              <div className="panel-header bg-slate-950/60">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Live Stack Trace & Exception Dump
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-slate-500">Captured in Ingestion Service</span>
              </div>

              <div className="bg-slate-950 p-4 font-mono text-[11px] leading-relaxed text-rose-200/90 overflow-x-auto max-h-[300px] select-text">
                <pre className="whitespace-pre">
                  {incident.stack_trace || "No stack trace attached to this anomaly."}
                </pre>
              </div>
            </div>

            {/* System Metrics Telemetry Gauges */}
            <div className="panel p-5">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-purple-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    System Telemetry at Incident Window
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-slate-500">Node: worker-node-04</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-center font-mono">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <span className="text-[10px] text-slate-500 uppercase">CPU Usage</span>
                  <p className="mt-1 text-lg font-extrabold text-white">{metrics.cpu_percent}%</p>
                  <div className="mt-1.5 h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${metrics.cpu_percent}%` }} />
                  </div>
                </div>

                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                  <span className="text-[10px] text-rose-300 uppercase">Memory</span>
                  <p className="mt-1 text-lg font-extrabold text-rose-400">{metrics.memory_percent}%</p>
                  <div className="mt-1.5 h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-rose-500" style={{ width: `${metrics.memory_percent}%` }} />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <span className="text-[10px] text-slate-500 uppercase">P95 Latency</span>
                  <p className="mt-1 text-lg font-extrabold text-amber-300">{metrics.latency_ms}ms</p>
                  <div className="mt-1.5 h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: "85%" }} />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <span className="text-[10px] text-slate-500 uppercase">Errors / Min</span>
                  <p className="mt-1 text-lg font-extrabold text-rose-400">{metrics.error_rate_per_min}</p>
                  <div className="mt-1.5 h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-rose-500" style={{ width: "95%" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Similar Historical Incidents from PostgreSQL + pgvector RAG */}
            <div className="panel p-5">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-cyan-400" />
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      RAG Vector Matches (PostgreSQL + pgvector)
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Embedding: all-MiniLM-L6-v2 (Cosine Similarity &gt; 0.80)
                    </p>
                  </div>
                </div>
                <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-cyan-400">
                  {incident.similar_incidents?.length || 0} Matches
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {incident.similar_incidents && incident.similar_incidents.length > 0 ? (
                  incident.similar_incidents.map((sim, index) => {
                    const matchPct = Math.round(sim.similarity_score * 100);
                    return (
                      <div
                        key={sim.id || index}
                        className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 transition hover:border-slate-700"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-cyan-400">
                                {sim.id}
                              </span>
                              <span className="text-xs font-bold text-slate-200">
                                {sim.title}
                              </span>
                            </div>
                            <p className="mt-1 font-mono text-[10px] text-slate-500">
                              Service: {sim.service_id} · Resolved: {sim.resolved_time || "Earlier"}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-mono text-xs font-extrabold text-emerald-400">
                              {matchPct}% Match
                            </span>
                            <span className="block text-[9px] uppercase tracking-wider text-slate-500">
                              Cosine Sim
                            </span>
                          </div>
                        </div>

                        <p className="mt-2 text-[11px] text-slate-400 bg-slate-900/60 rounded-lg p-2 font-mono">
                          Fix applied: {sim.fix_summary}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No historical matches in knowledge base.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: AI Doctor Synthesis & Code Remediation Diff (col-span-6) */}
          <div className="space-y-6 lg:col-span-6">
            {/* AI Diagnosis Card */}
            <AIAnalysis
              incident={incident}
              onRegenerate={handleRegenerate}
              onResolve={handleResolve}
              isRegenerating={isRegenerating}
            />

            {/* Code Remediation Diff Viewer */}
            <CodeDiffViewer
              diffText={incident.code_diff || `--- a/services/checkout.py
+++ b/services/checkout.py
@@ -140,8 +140,8 @@ def process_transaction(user_id: str, amount: float):
-    db_session = engine.connect()
-    record = db_session.execute(insert(Transaction).values(user=user_id, amount=amount))
+    with engine.begin() as conn:
+        record = conn.execute(insert(Transaction).values(user=user_id, amount=amount))
-    payment_gateway.charge(user_id, amount)
+        payment_gateway.charge(user_id, amount, timeout=5.0)
-    db_session.close()`}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
