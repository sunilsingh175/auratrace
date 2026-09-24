"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Copy,
  Check,
  Terminal,
  Database,
  FileCode,
} from "lucide-react";

import {
  fetchIncidentById,
  updateIncidentStatus,
} from "@/lib/api-client";

import type { Incident } from "@/types";
import { SeverityBadge } from "@/components/incidents/SeverityBadge";

function formatTime(value: unknown): string {
  if (!value) return "Unknown";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function IncidentDetailsPage() {
  const params = useParams();

  const incidentId = Array.isArray(params?.id)
    ? params.id[0]
    : String(params?.id || "");

  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedPatch, setCopiedPatch] = useState(false);
  const [copiedTrace, setCopiedTrace] = useState(false);

  const loadIncident = useCallback(async () => {
    if (!incidentId) return;

    try {
      setError(null);
      const result = await fetchIncidentById(incidentId);

      if (!result) {
        setError("Crash incident not found.");
        return;
      }

      setIncident(result);
    } catch (err) {
      console.error("Failed to load crash details:", err);
      setError("Unable to load crash details.");
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    loadIncident();
  }, [loadIncident]);

  const data = incident as any;
  const rootCause = String(data?.ai_root_cause || data?.root_cause || "").trim();
  const recoveryPatch = String(
    data?.ai_suggested_patch ||
      data?.suggested_patch ||
      data?.ai_recommended_fix ||
      data?.code_diff ||
      ""
  ).trim();

  const diagnosed = Boolean(
    (data?.is_diagnosed || (rootCause && !rootCause.includes("processing in background"))) &&
      (rootCause || recoveryPatch)
  );

  // Auto-poll every 1.5s until Gemini RAG diagnosis is completed
  useEffect(() => {
    if (!incidentId || diagnosed) return;

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      if (attempts > 50) {
        clearInterval(interval);
        return;
      }

      try {
        const fresh = await fetchIncidentById(incidentId);
        if (!fresh) return;

        const fData = fresh as any;
        const fRoot = String(fData?.ai_root_cause || fData?.root_cause || "").trim();
        const fPatch = String(
          fData?.ai_suggested_patch ||
            fData?.suggested_patch ||
            fData?.ai_recommended_fix ||
            fData?.code_diff ||
            ""
        ).trim();

        if (fData.is_diagnosed || (fRoot && !fRoot.includes("processing in background"))) {
          setIncident(fresh);
          clearInterval(interval);
        }
      } catch (err) {
        // Silently continue polling
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [incidentId, diagnosed]);

  // Listen to WebSocket events dispatched from notification context
  useEffect(() => {
    const handleEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent?.detail;
      const incomingId = detail?.data?.incident_id || detail?.incident_id || detail?.id;

      if (!incomingId || incomingId === incidentId) {
        const eventData = detail?.data || detail;
        if (eventData?.ai_root_cause || eventData?.ai_suggested_patch) {
          setIncident((prev: any) => ({
            ...prev,
            is_diagnosed: true,
            ai_root_cause: eventData.ai_root_cause || prev?.ai_root_cause,
            ai_suggested_patch: eventData.ai_suggested_patch || prev?.ai_suggested_patch,
            ai_recommended_fix: eventData.ai_suggested_patch || prev?.ai_recommended_fix,
          }));
        }
        loadIncident();
      }
    };

    window.addEventListener("aura:incident_diagnosed", handleEvent);
    window.addEventListener("aura:telemetry_event", handleEvent);

    return () => {
      window.removeEventListener("aura:incident_diagnosed", handleEvent);
      window.removeEventListener("aura:telemetry_event", handleEvent);
    };
  }, [incidentId, loadIncident]);

  const handleStatusChange = useCallback(
    async (newStatus: "OPEN" | "INVESTIGATING" | "RESOLVED") => {
      if (!incident?.id || updatingStatus) return;

      setUpdatingStatus(true);
      setError(null);

      // Optimistic update
      setIncident((prev: any) => (prev ? { ...prev, status: newStatus } : prev));

      try {
        await updateIncidentStatus(incident.id, newStatus);
        const freshIncident = await fetchIncidentById(incident.id);
        if (freshIncident) {
          setIncident(freshIncident);
        }
      } catch (err) {
        console.error("Failed to update status:", err);
        setError("Unable to update crash status.");
      } finally {
        setUpdatingStatus(false);
      }
    },
    [incident, updatingStatus]
  );

  const appName = String(data?.service_id || "Unknown application");
  const errorType = String(data?.error_type || "ApplicationException");
  const crashTitle =
    data?.title ||
    (errorType === "PoolTimeout" || errorType === "ConnectionPoolTimeout"
      ? "Database connection pool exhausted"
      : errorType === "RedisConnectionRefused"
      ? "Redis cache connection refused"
      : errorType === "OutOfMemoryError"
      ? "Node process heap out of memory"
      : errorType);

  const stackTrace = String(
    data?.stack_trace || data?.raw_stack_trace || "No stack trace available for this event."
  ).trim();

  const historicalMatches = Array.isArray(data?.similar_incidents)
    ? data.similar_incidents
    : [];

  const status = String(data?.status || "OPEN");

  const copyPatchToClipboard = async () => {
    if (!recoveryPatch) return;
    try {
      await navigator.clipboard.writeText(recoveryPatch);
      setCopiedPatch(true);
      setTimeout(() => setCopiedPatch(false), 2000);
    } catch {
      // Fallback
    }
  };

  const copyTraceToClipboard = async () => {
    if (!stackTrace) return;
    try {
      await navigator.clipboard.writeText(stackTrace);
      setCopiedTrace(true);
      setTimeout(() => setCopiedTrace(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <AppShell hideHeaderTitle>
      <div className="max-w-5xl mx-auto space-y-6 pb-16">
        {/* Navigation & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href="/incidents"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors font-heading"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to All Crashes</span>
          </Link>

          <div className="flex items-center gap-2">
            {status !== "RESOLVED" ? (
              <button
                type="button"
                onClick={() => handleStatusChange("RESOLVED")}
                disabled={updatingStatus}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition font-heading cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {updatingStatus ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                <span>{updatingStatus ? "Resolving..." : "Mark Resolved"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleStatusChange("OPEN")}
                disabled={updatingStatus}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition font-heading cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${updatingStatus ? "animate-spin" : ""}`} />
                <span>{updatingStatus ? "Updating..." : "Re-open Crash"}</span>
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="panel p-16 text-center bg-white border-slate-100">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-slate-400" />
            <p className="mt-3 text-sm font-bold text-slate-700 font-heading">
              Loading Crash Details &amp; AI Diagnosis...
            </p>
          </div>
        ) : !incident ? (
          <div className="panel p-12 text-center bg-white border-rose-200">
            <AlertTriangle className="mx-auto h-8 w-8 text-rose-500" />
            <h2 className="mt-3 text-base font-bold text-slate-900 font-heading">
              Crash Unavailable
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              The requested crash incident could not be found.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. WHAT CRASHED: Crash Header Card */}
            <div className="panel p-6 bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <SeverityBadge severity={data?.severity || "high"} />
                {status === "RESOLVED" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 font-heading">
                    <CheckCircle2 className="h-3 w-3" />
                    RESOLVED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 font-heading">
                    <AlertTriangle className="h-3 w-3" />
                    ACTIVE CRASH
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 tracking-tight mt-1">
                {crashTitle}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-600 font-sans border-t border-slate-100 pt-3.5">
                <div>
                  Application: <strong className="text-slate-900 font-semibold">{appName}</strong>{" "}
                  <span className="text-slate-400 font-normal">(Auto-detected)</span>
                </div>
                <span className="text-slate-300">•</span>
                <div>
                  Detected: <strong className="text-slate-900 font-semibold">{formatTime(data?.created_at)}</strong>
                </div>
                <span className="text-slate-300">•</span>
                <div className="inline-flex items-center gap-1.5 font-mono text-[11px] text-slate-700">
                  <Terminal className="h-3.5 w-3.5 text-slate-400" />
                  <span>Error: <strong className="font-semibold text-slate-900">{errorType}</strong></span>
                </div>
              </div>
            </div>

            {/* 2. WHY IT CRASHED: AI Diagnosis — What Happened & Why */}
            <div className="panel p-6 bg-white border-purple-100 shadow-[0_4px_20px_-4px_rgba(168,85,247,0.05)]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <h2 className="text-xs font-bold font-heading text-slate-900 uppercase tracking-wider">
                    AI Diagnosis — What Happened &amp; Why
                  </h2>
                </div>

                {diagnosed ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200/80 px-3 py-1 rounded-full font-heading">
                    <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                    AI Diagnosis: Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full font-heading">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    AI Diagnosing...
                  </span>
                )}
              </div>

              {diagnosed && rootCause ? (
                <div className="space-y-3">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-heading block">
                    Root Cause
                  </span>
                  <div className="rounded-xl bg-purple-50/40 border border-purple-100/80 p-4 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                    {rootCause}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-6 text-center text-xs font-sans">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
                      <Sparkles className="h-5 w-5 animate-spin text-purple-600" />
                    </div>
                    <p className="font-bold text-slate-800 font-heading text-sm mt-1">
                      AI Doctor is diagnosing root cause...
                    </p>
                    <p className="text-slate-500 text-xs max-w-md">
                      Retrieving similar historical crashes via pgvector and synthesizing Gemini remediation patch.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 3. HISTORICAL MATCHES: Historical Fixes (pgvector RAG) */}
            {historicalMatches.length > 0 && (
              <div className="panel p-6 bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-slate-500" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-heading">
                      Historical Fixes
                    </h2>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {historicalMatches.map((match: any, idx: number) => {
                    const score = typeof match.similarity_score === "number" ? match.similarity_score : null;
                    const matchPercent = score !== null ? (score <= 1 ? (score * 100).toFixed(1) : score.toFixed(1)) : null;

                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-slate-100 bg-[#f8fafc] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="font-bold text-slate-400 font-mono text-[11px] mt-0.5">
                            {idx + 1}.
                          </span>
                          <div>
                            <p className="font-bold text-slate-900 font-heading">
                              {match.title || match.fix_summary}
                            </p>
                            {match.fix_summary && match.title !== match.fix_summary && (
                              <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                                {match.fix_summary}
                              </p>
                            )}
                          </div>
                        </div>

                        {matchPercent !== null && (
                          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 shrink-0 font-mono">
                            {matchPercent}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="text-[11px] text-slate-400 font-sans mt-3.5">
                  Retrieved using pgvector semantic search.
                </p>
              </div>
            )}

            {/* 4. WHAT CODE TO CHANGE: Recommended Code Fix & Patch */}
            {diagnosed && recoveryPatch ? (
              <div className="panel p-6 bg-slate-950 border-slate-900 text-white shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileCode className="h-4 w-4 text-emerald-400" />
                      <h2 className="text-xs font-bold font-heading text-white uppercase tracking-wider">
                        Recommended Code Fix
                      </h2>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                      Generated remediation patch
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={copyPatchToClipboard}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 px-4 py-2 text-xs font-bold transition font-heading cursor-pointer shrink-0 self-start sm:self-auto shadow-xs"
                  >
                    {copiedPatch ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Code Fix Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-600" />
                        <span>Copy Code Fix</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 font-mono text-xs text-slate-200 leading-relaxed overflow-x-auto">
                  <pre className="whitespace-pre-wrap">{recoveryPatch}</pre>
                </div>
              </div>
            ) : !diagnosed ? (
              <div className="panel p-6 bg-slate-950 border-slate-900 text-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-slate-400 animate-pulse" />
                    <div>
                      <h2 className="text-xs font-bold font-heading text-white uppercase tracking-wider">
                        Recommended Code Fix
                      </h2>
                      <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                        Generating remediation patch...
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 font-mono text-xs text-slate-400 text-center animate-pulse">
                  // Remediation patch will appear here automatically when AI diagnosis completes...
                </div>
              </div>
            ) : null}

            {/* 5. EVIDENCE: Stack Trace & Error Context (at the bottom) */}
            <div className="panel p-6 bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-slate-500" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-heading">
                    Stack Trace &amp; Error Context
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={copyTraceToClipboard}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition font-heading cursor-pointer"
                >
                  {copiedTrace ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy Trace</span>
                    </>
                  )}
                </button>
              </div>

              <div className="rounded-xl bg-slate-950 border border-slate-900 p-4 font-mono text-[11px] text-rose-300 leading-relaxed overflow-x-auto max-h-80 shadow-inner">
                <pre className="whitespace-pre-wrap">{stackTrace}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}