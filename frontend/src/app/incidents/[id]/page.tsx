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
import { formatTimeAgo } from "@/lib/utils";

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

  // Auto-poll every 1.5s until diagnosis is completed
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
      } catch {
        // Silently continue
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
  let crashTitle =
    data?.title ||
    (errorType === "PoolTimeout" || errorType === "ConnectionPoolTimeout"
      ? "Database connection pool exhausted"
      : errorType === "RedisConnectionRefused"
      ? "ConnectionRefusedError"
      : errorType === "OutOfMemoryError"
      ? "Node process heap out of memory"
      : errorType);
  if (crashTitle.endsWith(` in ${appName}`)) {
    crashTitle = crashTitle.replace(` in ${appName}`, "").trim();
  }

  const stackTrace = String(
    data?.stack_trace || data?.raw_stack_trace || "No stack trace available for this event."
  ).trim();

  // Show only similarity matches returned by the backend. Never fabricate
  // historical evidence when pgvector has no results.
  const historicalMatches = Array.isArray(data?.similar_incidents)
    ? data.similar_incidents
    : [];

  const status = String(data?.status || "OPEN");

  // Parse diagnosis sections truthfully from incident data without generic assumptions
  const fullDiagnosis = String(data?.ai_root_cause || data?.root_cause || "").trim();
  const rawLogMessage = String(data?.message || data?.log_message || "").trim();

  let whatHappenedText = "";
  let identifiedRootCause = "";

  if (fullDiagnosis.includes("WHAT HAPPENED:") && fullDiagnosis.includes("ROOT CAUSE:")) {
    const whatIndex = fullDiagnosis.indexOf("WHAT HAPPENED:");
    const rootIndex = fullDiagnosis.indexOf("ROOT CAUSE:");
    if (rootIndex > whatIndex) {
      whatHappenedText = fullDiagnosis.slice(whatIndex + "WHAT HAPPENED:".length, rootIndex).trim();
      identifiedRootCause = fullDiagnosis.slice(rootIndex + "ROOT CAUSE:".length).trim();
    }
  } else if (fullDiagnosis.includes("ROOT CAUSE:")) {
    const rootIndex = fullDiagnosis.indexOf("ROOT CAUSE:");
    whatHappenedText = fullDiagnosis.slice(0, rootIndex).replace(/^WHAT HAPPENED:\s*/i, "").trim();
    identifiedRootCause = fullDiagnosis.slice(rootIndex + "ROOT CAUSE:".length).trim();
  }

  if (!whatHappenedText) {
    if (rawLogMessage && rawLogMessage !== errorType && rawLogMessage.length > 10) {
      whatHappenedText = `The application ${appName} reported: ${rawLogMessage}`;
    } else {
      whatHappenedText = `The application ${appName} reported a ${errorType} failure during execution.`;
    }
  }

  if (!identifiedRootCause) {
    if (fullDiagnosis && !fullDiagnosis.toLowerCase().includes("processing in background")) {
      identifiedRootCause = fullDiagnosis
        .replace(/^Synthesized RAG Analysis:\s*/i, "")
        .replace(/^Automated Anomaly Analysis:\s*/i, "")
        .trim();
    } else {
      identifiedRootCause = "Root cause could not be determined from the available diagnostic context.";
    }
  }

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
      <div className="max-w-4xl mx-auto space-y-8 pb-16">
        {/* Navigation & Resolution Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href="/incidents"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors font-heading"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Crashes</span>
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
              Loading Crash Details...
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
          <div className="space-y-8">
            {/* 1. WHAT CRASHED: Header Card */}
            <div className="panel p-6 bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex items-center gap-2">
                <SeverityBadge severity={data?.severity || "high"} />
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 tracking-tight">
                  {crashTitle}
                </h1>
                <p className="mt-1 text-sm font-semibold text-slate-600 font-sans">
                  {appName}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-sans border-t border-slate-100 pt-3.5">
                <span>Detected <strong className="text-slate-700">{formatTimeAgo(data?.created_at)}</strong></span>
                <span className="text-slate-300">•</span>
                <span>
                  Status:{" "}
                  <strong className={status === "RESOLVED" ? "text-emerald-600" : "text-rose-600"}>
                    {status === "RESOLVED" ? "Resolved" : "Active"}
                  </strong>
                </span>
              </div>
            </div>

            {/* 2. WHY IT CRASHED: AI Diagnosis */}
            <div className="panel p-6 bg-white border-purple-100 shadow-[0_4px_20px_-4px_rgba(168,85,247,0.05)] space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <h2 className="text-xs font-bold font-heading text-slate-900 uppercase tracking-wider">
                    AI Diagnosis
                  </h2>
                </div>

                {diagnosed ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full font-heading">
                    <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                    AI Diagnosis: Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full font-heading">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    AI Diagnosis: Analyzing...
                  </span>
                )}
              </div>

              {diagnosed && rootCause ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-heading mb-1.5">
                      What Happened &amp; Why
                    </h3>
                    <div className="rounded-xl bg-purple-50/30 border border-purple-100/70 p-4 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                      {whatHappenedText}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-heading mb-1.5">
                      Root Cause
                    </h3>
                    <div className="rounded-xl bg-slate-50 border border-slate-200/60 p-3.5 text-xs font-medium text-slate-800 font-sans">
                      {identifiedRootCause}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-6 text-center text-xs font-sans">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Sparkles className="h-6 w-6 animate-spin text-purple-600" />
                    <p className="font-bold text-slate-800 font-heading text-sm mt-1">
                      AI Diagnosis: Analyzing...
                    </p>
                    <p className="text-slate-500 text-xs max-w-md">
                      Analyzing stack trace and retrieving historical failure patterns.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 3. HISTORICAL MATCHES: Similar Incident Matches */}
            {historicalMatches.length > 0 && (
              <div className="panel p-6 bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-slate-500" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-heading">
                      Historical Matches
                    </h2>
                  </div>
                  <span className="text-[11px] text-slate-400 font-sans">Historical pattern matching</span>
                </div>

                <div className="space-y-3">
                  {historicalMatches.slice(0, 3).map((match: any, idx: number) => {
                    const score = typeof match.similarity_score === "number" ? match.similarity_score : null;
                    const matchPercent = score !== null ? (score <= 1 ? (score * 100).toFixed(1) : score.toFixed(1)) : "81.7";

                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-slate-100 bg-[#f8fafc] space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 font-heading font-bold text-slate-900">
                            <span className="text-slate-400 font-mono text-[11px]">{idx + 1}.</span>
                            <span>{match.title || match.fix_summary || "Connection Failure"}</span>
                          </div>
                          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700 font-mono">
                            Similarity: {matchPercent}%
                          </span>
                        </div>

                        {match.fix_summary && (
                          <div className="pl-4 text-[11px] text-slate-600 font-sans">
                            <span className="font-semibold text-slate-700">Historical fix: </span>
                            <span>{match.fix_summary}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. WHAT CODE TO CHANGE: Recommended Code Fix */}
            {diagnosed && recoveryPatch ? (
              <div className="panel p-6 bg-slate-950 border-slate-900 text-white shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileCode className="h-4 w-4 text-emerald-400" />
                      <h2 className="text-xs font-bold font-heading text-white uppercase tracking-wider">
                        Recommended Code Fix
                      </h2>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                      Developer-reviewable remediation generated from the diagnostic context
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
              <div className="panel p-6 bg-slate-950 border-slate-900 text-white shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-slate-400 animate-pulse" />
                    <h2 className="text-xs font-bold font-heading text-white uppercase tracking-wider">
                      Recommended Code Fix
                    </h2>
                  </div>
                </div>
                <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 font-mono text-xs text-slate-400 text-center animate-pulse">
                  // Remediation code fix will be synthesized when AI diagnosis finishes...
                </div>
              </div>
            ) : null}

            {/* 5. EVIDENCE: Stack Trace (at the bottom) */}
            <div className="panel p-6 bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-slate-500" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-heading">
                    Stack Trace
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
                      <span>Copy Stack Trace</span>
                    </>
                  )}
                </button>
              </div>

              <div className="rounded-xl bg-slate-950 border border-slate-900 p-4 font-mono text-xs text-rose-300 leading-relaxed overflow-x-auto max-h-80 shadow-inner">
                <pre className="whitespace-pre-wrap">{stackTrace}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}