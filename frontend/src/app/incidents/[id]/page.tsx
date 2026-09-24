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
  regenerateIncidentDiagnosis,
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
  const [regenerating, setRegenerating] = useState(false);
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

  const handleRegenerate = useCallback(async () => {
    if (!incident?.id || regenerating) return;

    setRegenerating(true);
    setError(null);

    try {
      await regenerateIncidentDiagnosis(incident.id);

      for (let attempt = 0; attempt < 15; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));

        try {
          const freshIncident = await fetchIncidentById(incident.id);
          if (!freshIncident) continue;

          const fData = freshIncident as any;
          const fRoot = String(fData.ai_root_cause || "").trim();
          const fPatch = String(
            fData.ai_suggested_patch ||
              fData.ai_recommended_fix ||
              fData.code_diff ||
              ""
          ).trim();

          const isNowDiagnosed = Boolean(
            fData.is_diagnosed && (fRoot || fPatch) && !fRoot.includes("processing in background")
          );

          if (isNowDiagnosed || fRoot || fPatch) {
            setIncident(freshIncident);
            if (isNowDiagnosed) {
              break;
            }
          }
        } catch (pollError) {
          console.error("Crash diagnosis polling error:", pollError);
        }
      }
    } catch (err) {
      console.error("Failed to regenerate diagnosis:", err);
      setError("Unable to regenerate AI diagnosis.");
    } finally {
      setRegenerating(false);
    }
  }, [incident, regenerating]);

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
        {/* Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href="/incidents"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors font-heading"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to All Crashes</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={regenerating}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 transition font-heading disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  regenerating ? "animate-spin text-red-600" : ""
                }`}
              />
              <span>{regenerating ? "Diagnosing..." : "Re-Diagnose with AI"}</span>
            </button>

            {status !== "RESOLVED" ? (
              <button
                type="button"
                onClick={() => handleStatusChange("RESOLVED")}
                disabled={updatingStatus}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition font-heading cursor-pointer disabled:opacity-50"
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
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition font-heading cursor-pointer disabled:opacity-50"
              >
                {updatingStatus ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-500" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                )}
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
              Loading Crash Details &amp; AI Analysis...
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
            {/* 1. Crash Header Card */}
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
                <span className="text-slate-300">•</span>
                <span className="text-[11px] text-slate-400 font-sans">
                  Detected at {formatTime(data?.created_at)}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Application: <strong className="text-slate-800">{appName}</strong> (Auto-detected)
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 tracking-tight mt-1">
                {crashTitle}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500 font-sans border-t border-slate-100 pt-3">
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-slate-700 font-mono text-[11px] border border-slate-200/60">
                  <Terminal className="h-3.5 w-3.5 text-slate-400" />
                  <span>Error: {errorType}</span>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-slate-700 font-mono text-[11px] border border-slate-200/60">
                  <span>Crash ID: {data?.id?.substring(0, 8)}</span>
                </div>
              </div>
            </div>

            {/* 2. What Happened & Why (AI Root Cause) */}
            <div className="panel p-6 bg-white border-red-100 shadow-[0_4px_20px_-4px_rgba(220,38,38,0.05)]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className={`h-5 w-5 text-red-600 ${!diagnosed ? "animate-pulse" : ""}`} />
                  <h2 className="text-sm font-bold font-heading text-slate-900 uppercase tracking-wider">
                    AI Diagnosis: What Happened &amp; Why
                  </h2>
                </div>
                {diagnosed ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3 w-3" />
                    pgvector + Gemini Analysis
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Gemini AI Analyzing...
                  </span>
                )}
              </div>

              {diagnosed && rootCause ? (
                <div className="rounded-xl bg-red-50/30 border border-red-100/80 p-4 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap animate-fadeIn">
                  {rootCause}
                </div>
              ) : (
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-6 text-center text-xs font-sans">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-600 border border-red-100">
                      <Sparkles className="h-5 w-5 animate-spin text-red-600" />
                    </div>
                    <p className="font-bold text-slate-800 font-heading text-sm mt-1">
                      AI Doctor is diagnosing root cause...
                    </p>
                    <p className="text-slate-500 text-xs max-w-md">
                      Retrieving similar historical crashes via pgvector and synthesizing Gemini recovery patch. Auto-refreshing in real-time...
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Recommended Code Fix & Patch */}
            {diagnosed && recoveryPatch ? (
              <div className="panel p-6 bg-slate-950 border-slate-900 text-white shadow-xl animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <FileCode className="h-5 w-5 text-emerald-400" />
                    <div>
                      <h2 className="text-sm font-bold font-heading text-white">
                        Recommended Code Fix
                      </h2>
                      <p className="text-[11px] text-slate-400 font-sans">
                        Generated fix patch ready to apply to your application
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={copyPatchToClipboard}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-white transition font-heading cursor-pointer"
                  >
                    {copiedPatch ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Patch Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-300" />
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
                    <FileCode className="h-5 w-5 text-slate-400 animate-pulse" />
                    <div>
                      <h2 className="text-sm font-bold font-heading text-white">
                        Recommended Code Fix
                      </h2>
                      <p className="text-[11px] text-slate-400 font-sans">
                        Generating remediation patch in background...
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 font-mono text-xs text-slate-400 text-center animate-pulse">
                  // Remediation patch will appear here automatically when Gemini completes analysis...
                </div>
              </div>
            ) : null}

            {/* 4. Similar Historical Errors (pgvector RAG) */}
            {historicalMatches.length > 0 && (
              <div className="panel p-6 bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] animate-fadeIn">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <Database className="h-4 w-4 text-slate-500" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-heading">
                    Similar Historical Errors ({historicalMatches.length} Matches Found)
                  </h2>
                </div>

                <div className="space-y-3">
                  {historicalMatches.map((match: any, idx: number) => {
                    const score = typeof match.similarity_score === "number" ? match.similarity_score : null;
                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-slate-100 bg-[#f8fafc] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-900 font-heading">
                            {match.title || match.fix_summary}
                          </p>
                          <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                            {match.fix_summary}
                          </p>
                        </div>

                        {score !== null && (
                          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 shrink-0 font-heading">
                            {Math.round(score * 100)}% match
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. Stack Trace Block */}
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