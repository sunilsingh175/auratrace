"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  ShieldAlert,
  Terminal,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { fetchIncidentById, updateIncidentStatus, Incident } from "@/lib/api-client";
import { CodeDiffViewer } from "@/components/code-diff-viewer";
import { formatTimeAgo } from "@/lib/utils";

export default function IncidentDetailPage() {
  const params = useParams();
  const incidentId = params?.id as string;

  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [copiedTrace, setCopiedTrace] = useState(false);

  useEffect(() => {
    if (!incidentId) return;
    fetchIncidentById(incidentId).then((data) => {
      setIncident(data);
      setLoading(false);
    });
  }, [incidentId]);

  const handleStatusChange = async (newStatus: "OPEN" | "INVESTIGATING" | "RESOLVED") => {
    if (!incident) return;
    setUpdatingStatus(true);
    const updated = await updateIncidentStatus(incident.id, newStatus);
    if (updated) {
      setIncident(updated);
    }
    setUpdatingStatus(false);
  };

  const handleCopyTrace = () => {
    if (!incident?.raw_stack_trace) return;
    navigator.clipboard.writeText(incident.raw_stack_trace);
    setCopiedTrace(true);
    setTimeout(() => setCopiedTrace(false), 2000);
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500">
        <Sparkles className="w-8 h-8 mx-auto mb-3 animate-spin text-cyan-400" />
        <p className="text-sm font-medium">Retrieving AI Crash Diagnosis...</p>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="py-20 text-center text-slate-400">
        <AlertCircle className="w-10 h-10 mx-auto mb-2 text-rose-500" />
        <h2 className="text-lg font-bold text-slate-200">Incident Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">The requested incident ID does not exist in the database.</p>
        <Link
          href="/incidents"
          className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-slate-300 hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Incidents
        </Link>
      </div>
    );
  }

  const scorePct = Math.round(incident.anomaly_score * 100);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Back Navigation & Status Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/incidents"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Incidents
        </Link>

        {/* Triage Status Control */}
        <div className="flex items-center gap-2 bg-surface border border-border rounded-xl p-1.5 shadow-md">
          <span className="text-xs text-slate-400 px-2 font-medium">Status:</span>
          {(["OPEN", "INVESTIGATING", "RESOLVED"] as const).map((st) => (
            <button
              key={st}
              disabled={updatingStatus}
              onClick={() => handleStatusChange(st)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                incident.status === st
                  ? st === "OPEN"
                    ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                    : st === "INVESTIGATING"
                    ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                    : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Incident Header Card */}
      <div className="bg-surface/90 border border-border rounded-xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {incident.service_id}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {new Date(incident.created_at).toLocaleString()} ({formatTimeAgo(incident.created_at)})
              </span>
              <span className="text-xs text-slate-500 font-mono">ID: {incident.id}</span>
            </div>

            <h1 className="text-2xl font-bold text-slate-100 mt-2">
              {incident.error_type || "System Anomaly Incident"}
            </h1>
          </div>

          {/* Anomaly Score Badge */}
          <div className="bg-background/80 border border-border rounded-xl p-3.5 text-center min-w-[130px] shrink-0">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
              Anomaly Score
            </span>
            <span
              className={`text-2xl font-mono font-black ${
                scorePct >= 80 ? "text-rose-400" : "text-amber-400"
              }`}
            >
              {scorePct}%
            </span>
            <span className="text-[10px] text-slate-500 block">Outlier Confidence</span>
          </div>
        </div>
      </div>

      {/* AI Doctor Root-Cause Analysis Section */}
      <div className="bg-gradient-to-br from-surface to-surface-raised border border-cyan-500/30 rounded-xl p-6 shadow-2xl space-y-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-2 text-cyan-400">
          <Sparkles className="w-5 h-5" />
          <h2 className="text-base font-bold text-slate-100 tracking-wide">
            AI Doctor Root-Cause Synthesis
          </h2>
        </div>

        <div className="text-sm text-slate-300 leading-relaxed space-y-2 whitespace-pre-line bg-background/50 p-4 rounded-xl border border-border/60">
          {incident.ai_root_cause || "Diagnosing root cause using RAG pgvector similarity match..."}
        </div>
      </div>

      {/* Recommended Code Diff Patch */}
      {incident.ai_suggested_patch ? (
        <CodeDiffViewer
          diffText={incident.ai_suggested_patch}
          title="Automated Self-Healing Code Patch"
        />
      ) : null}

      {/* Raw Captured Stack Trace */}
      <div className="bg-slate-950 border border-border rounded-xl overflow-hidden shadow-2xl">
        <div className="bg-surface-raised/80 border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-200">Raw Stack Trace & Context</span>
          </div>

          <button
            onClick={handleCopyTrace}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface hover:bg-slate-800 border border-border text-xs text-slate-300 transition-colors"
          >
            {copiedTrace ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Trace</span>
              </>
            )}
          </button>
        </div>

        <div className="p-4 font-mono text-xs text-rose-300/90 overflow-x-auto whitespace-pre leading-relaxed">
          {incident.raw_stack_trace || "No stack trace attached."}
        </div>
      </div>
    </div>
  );
}
