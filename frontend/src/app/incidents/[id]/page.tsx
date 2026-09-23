"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/context/auth-context";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Server,
  Sparkles,
  FileCode,
  Layers,
  Database,
} from "lucide-react";

import {
  fetchIncidentById,
  regenerateIncidentDiagnosis,
  updateIncidentStatus,
} from "@/lib/api-client";

import type { Incident } from "@/types";

function safeNumber(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatPercent(value: unknown): string {
  const number = safeNumber(value);
  if (number <= 1) {
    return `${Math.round(number * 100)}%`;
  }
  return `${Math.round(number)}%`;
}

function formatTime(value: unknown): string {
  if (!value) return "Unknown";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function formatTimeAgo(value: unknown): string {
  if (!value) return "Unknown";
  const timestamp = new Date(String(value)).getTime();
  if (!Number.isFinite(timestamp)) return "Unknown";

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function severityBadge(score: number) {
  if (score >= 0.9) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  if (score >= 0.75) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-yellow-50 text-yellow-700 border-yellow-200";
}

function statusBadge(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "RESOLVED" || normalized === "CLOSED") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (normalized === "INVESTIGATING") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  return "bg-amber-50 text-amber-700 border-amber-200";
}

export default function IncidentDetailsPage() {
  const params = useParams();
  const { user } = useAuth();

  const incidentId = Array.isArray(params?.id)
    ? params.id[0]
    : String(params?.id || "");

  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadIncident = useCallback(async () => {
    if (!incidentId) return;

    try {
      setError(null);
      const result = await fetchIncidentById(incidentId);

      if (!result) {
        setError("Incident not found.");
        return;
      }

      setIncident(result);
    } catch (err) {
      console.error("Failed to load incident:", err);
      setError("Unable to load incident.");
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    loadIncident();
  }, [loadIncident]);

  const handleRegenerate = useCallback(async () => {
    if (!incident?.id || regenerating) return;

    setRegenerating(true);
    setError(null);

    try {
      await regenerateIncidentDiagnosis(incident.id);

      for (let attempt = 0; attempt < 15; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        try {
          const freshIncident = await fetchIncidentById(incident.id);
          if (!freshIncident) continue;

          setIncident(freshIncident);
          const data = freshIncident as any;
          const diagnosed = Boolean(data.is_diagnosed);
          const rootCause = String(data.ai_root_cause || "").trim();
          const patch = String(
            data.ai_suggested_patch ||
              data.ai_recommended_fix ||
              data.code_diff ||
              ""
          ).trim();

          if (diagnosed || rootCause || patch) {
            break;
          }
        } catch (pollError) {
          console.error("Incident polling error:", pollError);
        }
      }
    } catch (err) {
      console.error("Failed to regenerate diagnosis:", err);
      setError("Unable to regenerate diagnosis.");
    } finally {
      setRegenerating(false);
    }
  }, [incident, regenerating]);

  const handleStatusChange = useCallback(
    async (status: "OPEN" | "INVESTIGATING" | "RESOLVED") => {
      if (!incident?.id) return;

      try {
        setError(null);
        await updateIncidentStatus(incident.id, status);
        const freshIncident = await fetchIncidentById(incident.id);
        if (freshIncident) {
          setIncident(freshIncident);
        }
      } catch (err) {
        console.error("Failed to update incident status:", err);
        setError("Unable to update incident status.");
      }
    },
    [incident]
  );

  const data = incident as any;

  const score = useMemo(() => {
    return safeNumber(data?.anomaly_score, 0);
  }, [data?.anomaly_score]);

  const title = String(
    data?.title || data?.error_type || "Detected anomaly"
  );

  const serviceName = String(
    data?.service_id || "Unknown service"
  );

  const stackTrace = String(
    data?.stack_trace || data?.raw_stack_trace || ""
  ).trim();

  const rootCause = String(data?.ai_root_cause || "").trim();

  const recoveryPatch = String(
    data?.ai_suggested_patch ||
      data?.ai_recommended_fix ||
      data?.code_diff ||
      ""
  ).trim();

  const historicalMatches = Array.isArray(data?.similar_incidents)
    ? data.similar_incidents
    : [];

  const diagnosed = Boolean(data?.is_diagnosed);
  const status = String(data?.status || "OPEN");

  const systemMetrics = data?.system_metrics;
  const cpu = systemMetrics?.cpu ?? systemMetrics?.cpu_percent ?? null;
  const memory = systemMetrics?.memory ?? systemMetrics?.memory_percent ?? null;
  const p95 = systemMetrics?.p95_latency_ms ?? null;
  const errorsPerMinute = systemMetrics?.errors_per_minute ?? null;

  return (
    <AppShell hideHeaderTitle>
      <div className="space-y-6">
        {/* TOP BAR / BACK NAVIGATION */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/incidents"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to incidents
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={regenerating}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-100 transition-all font-heading disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  regenerating ? "animate-spin text-red-600" : ""
                }`}
              />
              <span>
                {regenerating ? "Regenerating..." : "Regenerate AI Diagnosis"}
              </span>
            </button>
          </div>
        </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 font-sans">
              {error}
            </div>
          )}

          {loading ? (
            <div className="panel p-12 text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-slate-400" />
              <p className="mt-3 text-sm font-semibold text-slate-600 font-heading">
                Loading Incident Diagnostics...
              </p>
            </div>
          ) : !incident ? (
            <div className="panel p-12 text-center border-rose-200 bg-rose-50/50">
              <AlertTriangle className="mx-auto h-8 w-8 text-rose-500" />
              <h2 className="mt-3 text-lg font-bold text-slate-900 font-heading">
                Incident Unavailable
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                The requested incident could not be found or has expired.
              </p>
            </div>
          ) : (
            <>
              {/* INCIDENT HEADER CARD */}
              <div className="panel p-6 border-slate-100">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${severityBadge(
                          score
                        )}`}
                      >
                        {formatPercent(score)} Outlier
                      </span>

                      <span
                        className={`rounded-full border px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${statusBadge(
                          status
                        )}`}
                      >
                        {status}
                      </span>

                      {regenerating && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-0.5 text-xs font-bold text-blue-700">
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          Diagnosing with Gemini
                        </span>
                      )}

                      {!regenerating && diagnosed && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 text-xs font-bold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          AI Diagnosed
                        </span>
                      )}
                    </div>

                    <h1 className="text-xl font-bold tracking-tight text-slate-900 font-heading sm:text-2xl">
                      {title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-sans">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                        <Server className="h-3.5 w-3.5 text-slate-400" />
                        {serviceName}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                        {formatTimeAgo(data?.created_at)}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        ID: {data?.id}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleStatusChange("INVESTIGATING")}
                      className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-all font-heading cursor-pointer"
                    >
                      Mark Investigating
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChange("RESOLVED")}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 shadow-sm hover:bg-emerald-100 transition-all font-heading cursor-pointer"
                    >
                      Mark Resolved
                    </button>
                  </div>
                </div>
              </div>

              {/* METRIC KPI CARDS */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="panel p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-heading">
                      Anomaly Score
                    </span>
                    <AlertTriangle className="h-4 w-4 text-rose-500" />
                  </div>
                  <p className="mt-3 font-mono text-2xl font-bold text-rose-600">
                    {formatPercent(score)}
                  </p>
                </div>

                <div className="panel p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-heading">
                      CPU Usage
                    </span>
                    <Activity className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-3 font-mono text-2xl font-bold text-slate-900">
                    {cpu === null ? "Unavailable" : `${Math.round(Number(cpu))}%`}
                  </p>
                </div>

                <div className="panel p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-heading">
                      Memory Load
                    </span>
                    <Activity className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-3 font-mono text-2xl font-bold text-slate-900">
                    {memory === null
                      ? "Unavailable"
                      : `${Math.round(Number(memory))}%`}
                  </p>
                </div>

                <div className="panel p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-heading">
                      P95 Latency
                    </span>
                    <Clock3 className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-3 font-mono text-2xl font-bold text-slate-900">
                    {p95 === null
                      ? "Unavailable"
                      : `${Math.round(Number(p95))} ms`}
                  </p>
                </div>
              </div>

              {/* AI DIAGNOSIS & RECOVERY PATCH */}
              <div className="panel border-red-100 overflow-hidden">
                <div className="border-b border-slate-100 bg-gradient-to-r from-red-50/50 to-white px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 text-red-600">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 font-heading">
                        AI Autonomous Diagnosis & Patch
                      </h2>
                      <p className="text-xs text-slate-500 font-sans">
                        Powered by Gemini RAG and localized telemetry embeddings
                      </p>
                    </div>
                  </div>

                  {diagnosed && !regenerating && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Active Diagnosis
                    </span>
                  )}
                </div>

                <div className="grid gap-6 p-6 lg:grid-cols-2">
                  {/* ROOT CAUSE */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-slate-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 font-heading">
                        Root Cause Breakdown
                      </h3>
                    </div>

                    {rootCause ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm leading-relaxed text-slate-800 font-sans shadow-sm whitespace-pre-wrap">
                        {rootCause}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 font-sans">
                        {regenerating
                          ? "AI diagnosis is being generated in background..."
                          : "No root cause generated yet."}
                      </div>
                    )}
                  </div>

                  {/* RECOVERY PATCH */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileCode className="h-4 w-4 text-slate-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 font-heading">
                        Automated Remediation / Patch
                      </h3>
                    </div>

                    {recoveryPatch ? (
                      <pre className="max-h-[360px] overflow-auto rounded-xl border border-slate-800 bg-slate-900 p-4 font-mono text-xs leading-relaxed text-emerald-400 shadow-sm">
                        {recoveryPatch}
                      </pre>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 font-sans">
                        {regenerating
                          ? "Generating recovery patch recommendations..."
                          : "No recovery patch generated yet."}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* STACK TRACE & HISTORICAL MATCHES */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* STACK TRACE */}
                <div className="panel p-6 border-slate-100">
                  <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 font-heading">
                        Raw Stack Trace
                      </h2>
                      <p className="text-xs text-slate-500 font-sans">
                        Captured from the anomaly trace telemetry
                      </p>
                    </div>
                  </div>

                  {stackTrace ? (
                    <pre className="max-h-[320px] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-800">
                      {stackTrace}
                    </pre>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                      No stack trace attached to this telemetry event.
                    </div>
                  )}
                </div>

                {/* HISTORICAL MATCHES */}
                <div className="panel p-6 border-slate-100">
                  <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-slate-500" />
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 font-heading">
                          pgvector Historical Matches
                        </h2>
                        <p className="text-xs text-slate-500 font-sans">
                          Semantic similarity with historical resolved incidents
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 font-heading">
                      {historicalMatches.length} Matches
                    </span>
                  </div>

                  {historicalMatches.length > 0 ? (
                    <div className="space-y-3">
                      {historicalMatches.slice(0, 3).map((match: any, index: number) => {
                        const matchTitle =
                          match.title ||
                          match.error_type ||
                          `Historical Incident ${index + 1}`;

                        const similarity = safeNumber(
                          match.similarity_score ??
                            match.similarity ??
                            match.score,
                          0
                        );

                        const fixSummary =
                          match.fix_summary || match.fix_description || "";

                        return (
                          <div
                            key={match.id || `${matchTitle}-${index}`}
                            className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-1.5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <span className="text-xs font-bold text-slate-800 font-heading">
                                {matchTitle}
                              </span>

                              {similarity > 0 && (
                                <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                  {formatPercent(similarity)} Match
                                </span>
                              )}
                            </div>

                            {fixSummary && (
                              <p className="text-xs leading-normal text-slate-600 font-sans">
                                {fixSummary}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                      No vector similarity matches found in database.
                    </div>
                  )}
                </div>
              </div>

              {/* TIMESTAMPS FOOTER */}
              <div className="text-center text-xs text-slate-400 font-sans pb-4">
                Telemetry recorded at {formatTime(data?.created_at)} • AuraTrace Engine
              </div>
            </>
          )}
        </div>
      </AppShell>
  );
}