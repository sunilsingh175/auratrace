"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/context/auth-context";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Server,
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
  if (!value) {
    return "Unknown";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function formatTimeAgo(value: unknown): string {
  if (!value) {
    return "Unknown";
  }

  const timestamp = new Date(String(value)).getTime();

  if (!Number.isFinite(timestamp)) {
    return "Unknown";
  }

  const seconds = Math.max(
    0,
    Math.floor((Date.now() - timestamp) / 1000)
  );

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  return `${days}d ago`;
}

function severityClass(score: number): string {
  if (score >= 0.9) {
    return "border-red-500/30 bg-red-500/10 text-red-400";
  }

  if (score >= 0.75) {
    return "border-orange-500/30 bg-orange-500/10 text-orange-400";
  }

  return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
}

function statusClass(status: string): string {
  const normalized = status.toUpperCase();

  if (normalized === "RESOLVED" || normalized === "CLOSED") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  }

  if (normalized === "INVESTIGATING") {
    return "border-blue-500/30 bg-blue-500/10 text-blue-400";
  }

  return "border-amber-500/30 bg-amber-500/10 text-amber-400";
}

function statusLabel(status: string): string {
  const normalized = status.toUpperCase();

  if (normalized === "RESOLVED") {
    return "Resolved";
  }

  if (normalized === "INVESTIGATING") {
    return "Investigating";
  }

  if (normalized === "CLOSED") {
    return "Closed";
  }

  return "Open";
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
    if (!incidentId) {
      return;
    }

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

  /*
   * Regeneration fix:
   *
   * The diagnose endpoint can return before the RAG worker has finished.
   * We therefore keep the existing incident on screen and poll the
   * canonical incident endpoint until is_diagnosed becomes true or
   * ai_root_cause / ai_suggested_patch are populated.
   */
  const handleRegenerate = useCallback(async () => {
    if (!incident?.id || regenerating) {
      return;
    }

    setRegenerating(true);
    setError(null);

    try {
      await regenerateIncidentDiagnosis(incident.id);

      for (let attempt = 0; attempt < 15; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        try {
          const freshIncident = await fetchIncidentById(
            incident.id
          );

          if (!freshIncident) {
            continue;
          }

          setIncident(freshIncident);

          const data = freshIncident as any;

          const diagnosed = Boolean(data.is_diagnosed);

          const rootCause = String(
            data.ai_root_cause || ""
          ).trim();

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
          console.error(
            "Incident polling error:",
            pollError
          );
        }
      }
    } catch (err) {
      console.error(
        "Failed to regenerate diagnosis:",
        err
      );

      setError("Unable to regenerate diagnosis.");
    } finally {
      setRegenerating(false);
    }
  }, [incident, regenerating]);

  const handleStatusChange = useCallback(
    async (status: "OPEN" | "INVESTIGATING" | "RESOLVED") => {
      if (!incident?.id) {
        return;
      }

      try {
        setError(null);

        await updateIncidentStatus(
          incident.id,
          status
        );

        const freshIncident = await fetchIncidentById(
          incident.id
        );

        if (freshIncident) {
          setIncident(freshIncident);
        }
      } catch (err) {
        console.error(
          "Failed to update incident status:",
          err
        );

        setError(
          "Unable to update incident status."
        );
      }
    },
    [incident]
  );

  const data = incident as any;

  const score = useMemo(() => {
    return safeNumber(
      data?.anomaly_score,
      0
    );
  }, [data?.anomaly_score]);

  const title = String(
    data?.title ||
    data?.error_type ||
    "Detected anomaly"
  );

  const serviceName = String(
    data?.service_id ||
    "Unknown service"
  );

  const stackTrace = String(
    data?.stack_trace ||
    data?.raw_stack_trace ||
    ""
  ).trim();

  /*
   * These are the ACTUAL backend fields.
   */
  const rootCause = String(
    data?.ai_root_cause || ""
  ).trim();

  const recoveryPatch = String(
    data?.ai_suggested_patch ||
    data?.ai_recommended_fix ||
    data?.code_diff ||
    ""
  ).trim();

  /*
   * Backend returns similar_incidents, not similar_fixes.
   */
  const historicalMatches = Array.isArray(
    data?.similar_incidents
  )
    ? data.similar_incidents
    : [];

  const diagnosed = Boolean(
    data?.is_diagnosed
  );

  const status = String(
    data?.status || "OPEN"
  );

  /*
   * The current incident API does not return these
   * metrics, so they are intentionally displayed as
   * unavailable rather than incorrectly showing 0.
   */
  const systemMetrics = data?.system_metrics;

  const cpu =
    systemMetrics?.cpu ??
    systemMetrics?.cpu_percent ??
    null;

  const memory =
    systemMetrics?.memory ??
    systemMetrics?.memory_percent ??
    null;

  const p95 =
    systemMetrics?.p95_latency_ms ??
    null;

  const errorsPerMinute =
    systemMetrics?.errors_per_minute ??
    null;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-3 text-slate-400">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading incident...
          </div>
        </div>
      </main>
    );
  }

  if (!incident) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <Link
            href="/incidents"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to incidents
          </Link>

          <div className="mt-8 rounded-xl border border-red-500/20 bg-red-500/5 p-8">
            <h1 className="text-xl font-semibold">
              Incident unavailable
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              {error ||
                "The requested incident could not be found."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <ProtectedRoute>
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-8">

        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/incidents"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to incidents
          </Link>

          {user && (
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={
                regenerating
                  ? "h-4 w-4 animate-spin"
                  : "h-4 w-4"
              }
            />

            {regenerating
              ? "Regenerating..."
              : "Regenerate Diagnosis"}
          </button>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* INCIDENT HEADER */}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-3">

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${severityClass(
                    score
                  )}`}
                >
                  {formatPercent(score)} Outlier
                </span>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${statusClass(
                    status
                  )}`}
                >
                  {statusLabel(status)}
                </span>

                {regenerating && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-400">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Diagnosing
                  </span>
                )}

                {!regenerating && diagnosed && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    AI Diagnosed
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-semibold tracking-tight">
                {title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-400">

                <span className="inline-flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  {serviceName}
                </span>

                <span className="inline-flex items-center gap-2">
                  <Clock3 className="h-4 w-4" />
                  {formatTimeAgo(data?.created_at)}
                </span>

                <span className="font-mono text-xs text-slate-500">
                  {data?.id}
                </span>
              </div>
            </div>

            {user && <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handleStatusChange(
                    "INVESTIGATING"
                  )
                }
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
              >
                Investigating
              </button>

              <button
                type="button"
                onClick={() =>
                  handleStatusChange("RESOLVED")
                }
                className="rounded-lg border border-emerald-500/30 px-3 py-2 text-xs text-emerald-400 hover:bg-emerald-500/10"
              >
                Resolve
              </button>
            </div>}
          </div>
        </section>

        {/* METRICS */}

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">

          <MetricCard
            label="Anomaly Score"
            value={formatPercent(score)}
            icon={
              <AlertTriangle className="h-5 w-5" />
            }
          />

          <MetricCard
            label="CPU"
            value={
              cpu === null
                ? "Unavailable"
                : `${Math.round(
                  Number(cpu)
                )}%`
            }
            icon={
              <Activity className="h-5 w-5" />
            }
          />

          <MetricCard
            label="Memory"
            value={
              memory === null
                ? "Unavailable"
                : `${Math.round(
                  Number(memory)
                )}%`
            }
            icon={
              <Activity className="h-5 w-5" />
            }
          />

          <MetricCard
            label="P95 Latency"
            value={
              p95 === null
                ? "Unavailable"
                : `${Math.round(
                  Number(p95)
                )} ms`
            }
            icon={
              <Clock3 className="h-5 w-5" />
            }
          />
        </section>

        {/* STACK TRACE + HISTORICAL FIXES */}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60">

            <div className="border-b border-slate-800 px-5 py-4">
              <h2 className="font-semibold">
                Stack Trace
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Captured from the anomalous telemetry event
              </p>
            </div>

            <div className="p-5">
              {stackTrace ? (
                <pre className="max-h-[420px] overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-300">
                  {stackTrace}
                </pre>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
                  No stack trace attached.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60">

            <div className="border-b border-slate-800 px-5 py-4">
              <h2 className="font-semibold">
                Historical Fixes
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Retrieved using pgvector similarity search
              </p>
            </div>

            <div className="p-5">

              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  {historicalMatches.length} Matches
                </span>

                <span className="text-xs text-slate-500">
                  Top 3 retrieval
                </span>
              </div>

              {historicalMatches.length > 0 ? (
                <div className="space-y-3">

                  {historicalMatches
                    .slice(0, 3)
                    .map(
                      (
                        match: any,
                        index: number
                      ) => {

                        const matchTitle =
                          match.title ||
                          match.error_type ||
                          `Historical Fix ${index + 1
                          }`;

                        const similarity =
                          safeNumber(
                            match.similarity_score ??
                            match.similarity ??
                            match.score,
                            0
                          );

                        const fixSummary =
                          match.fix_summary ||
                          match.fix_description ||
                          "";

                        return (
                          <div
                            key={
                              match.id ||
                              `${matchTitle}-${index}`
                            }
                            className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                          >

                            <div className="flex items-start justify-between gap-3">

                              <div>
                                <div className="text-sm font-medium text-slate-200">
                                  {matchTitle}
                                </div>

                                {match.id && (
                                  <div className="mt-1 font-mono text-[11px] text-slate-600">
                                    {match.id}
                                  </div>
                                )}
                              </div>

                              {similarity > 0 && (
                                <span className="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-400">
                                  {formatPercent(
                                    similarity
                                  )}
                                </span>
                              )}
                            </div>

                            {fixSummary && (
                              <p className="mt-3 text-xs leading-5 text-slate-400">
                                {fixSummary}
                              </p>
                            )}

                          </div>
                        );
                      }
                    )}

                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
                  No historical matches returned by the API.
                </div>
              )}

            </div>
          </section>
        </div>

        {/* AI DIAGNOSIS */}

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60">

          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">

            <div>
              <h2 className="font-semibold">
                AI Diagnostic Analysis
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Gemini 3.6 Flash RAG
              </p>
            </div>

            {diagnosed && !regenerating && (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Diagnosis available
              </span>
            )}

            {regenerating && (
              <span className="inline-flex items-center gap-1.5 text-xs text-blue-400">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Processing
              </span>
            )}
          </div>

          <div className="grid gap-6 p-5 lg:grid-cols-2">

            {/* ROOT CAUSE */}

            <div>
              <h3 className="mb-3 text-sm font-medium text-slate-300">
                Root Cause
              </h3>

              {rootCause ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 text-sm leading-7 text-slate-300">
                  {rootCause}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-800 p-5 text-sm text-slate-500">
                  {regenerating
                    ? "AI diagnosis is being generated..."
                    : "No root cause generated yet."}
                </div>
              )}
            </div>

            {/* RECOVERY PATCH */}

            <div>
              <h3 className="mb-3 text-sm font-medium text-slate-300">
                Recovery Patch
              </h3>

              {recoveryPatch ? (
                <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950 p-5 font-mono text-xs leading-6 text-slate-300">
                  {recoveryPatch}
                </pre>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-800 p-5 text-sm text-slate-500">
                  {regenerating
                    ? "Waiting for the generated recovery patch..."
                    : "No recovery patch generated yet."}
                </div>
              )}
            </div>

          </div>
        </section>

        {/* INCIDENT METRICS */}

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60">

          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="font-semibold">
              Incident Metrics
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Metrics returned by the incident API
            </p>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">

            <MetricRow
              label="CPU"
              value={
                cpu === null
                  ? "Unavailable"
                  : `${Math.round(
                    Number(cpu)
                  )}%`
              }
            />

            <MetricRow
              label="Memory"
              value={
                memory === null
                  ? "Unavailable"
                  : `${Math.round(
                    Number(memory)
                  )}%`
              }
            />

            <MetricRow
              label="P95 latency"
              value={
                p95 === null
                  ? "Unavailable"
                  : `${Math.round(
                    Number(p95)
                  )} ms`
              }
            />

            <MetricRow
              label="Errors / minute"
              value={
                errorsPerMinute === null
                  ? "Unavailable"
                  : String(
                    Math.round(
                      Number(
                        errorsPerMinute
                      )
                    )
                  )
              }
            />

          </div>
        </section>

        <div className="mt-6 text-xs text-slate-600">
          Created: {formatTime(data?.created_at)}
        </div>

      </div>
    </main>
    </ProtectedRoute>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">

      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">
          {label}
        </span>

        <span className="text-slate-500">
          {icon}
        </span>
      </div>

      <div className="mt-3 text-2xl font-semibold text-slate-100">
        {value}
      </div>

    </div>
  );
}

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">

      <div className="text-xs text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-lg font-medium text-slate-200">
        {value}
      </div>

    </div>
  );
}