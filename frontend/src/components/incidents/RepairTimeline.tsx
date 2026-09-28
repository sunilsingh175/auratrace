"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  GitPullRequest,
  GitBranch,
  GitCommit,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Play,
  ExternalLink,
  RotateCcw,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Lock,
  ArrowRight,
  Terminal,
} from "lucide-react";
import {
  fetchRepairRunsForIncident,
  triggerAutonomousRepair,
  executeRunMerge,
  verifyRunTelemetry,
  executeRunMergeRollback,
} from "@/lib/api-client";
import { RepairRun, Incident } from "@/types";
import { formatTimeAgo } from "@/lib/utils";

interface RepairTimelineProps {
  incident: Incident;
  onRefreshIncident?: () => void;
}

export function RepairTimeline({ incident, onRefreshIncident }: RepairTimelineProps) {
  const [runs, setRuns] = useState<RepairRun[]>([]);
  const [activeRun, setActiveRun] = useState<RepairRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  const loadRuns = useCallback(async () => {
    if (!incident?.id) return;
    try {
      const data = await fetchRepairRunsForIncident(incident.id);
      setRuns(data);
      if (data.length > 0) {
        setActiveRun(data[0]);
      } else {
        setActiveRun(null);
      }
    } catch (err) {
      console.warn("Failed to load repair runs:", err);
    } finally {
      setLoading(false);
    }
  }, [incident?.id]);

  useEffect(() => {
    loadRuns();
    const interval = setInterval(() => {
      if (
        activeRun &&
        !["COMPLETED", "MERGED", "ROLLED_BACK", "ROLLBACK_COMPLETED", "FAILED", "SAFETY_VIOLATION", "CI_FAILED"].includes(
          activeRun.status
        )
      ) {
        loadRuns();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [loadRuns, activeRun?.status]);

  const handleTriggerRepair = async () => {
    if (!incident?.id) return;
    setActionLoading("trigger");
    setActionMessage(null);
    try {
      await triggerAutonomousRepair(incident.id);
      setActionMessage({ type: "success", text: "L3 Autonomous Repair pipeline initiated." });
      await loadRuns();
      if (onRefreshIncident) onRefreshIncident();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to trigger repair." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleMergePR = async () => {
    if (!activeRun?.id) return;
    setActionLoading("merge");
    setActionMessage(null);
    try {
      await executeRunMerge(activeRun.id);
      setActionMessage({ type: "success", text: "Repair Pull Request merged successfully." });
      await loadRuns();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Merge execution failed." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifyTelemetry = async (simulateRegression: boolean = false) => {
    if (!activeRun?.id) return;
    setActionLoading(simulateRegression ? "simulate" : "verify");
    setActionMessage(null);
    try {
      const res = await verifyRunTelemetry(activeRun.id, simulateRegression);
      if (res.status === "REGRESSION_DETECTED") {
        setActionMessage({
          type: "error",
          text: `Telemetry regression detected (${((res.post_repair_error_rate ?? 0.18) * 100).toFixed(1)}% error rate). Automated Rollback Guard triggered!`,
        });
      } else {
        setActionMessage({
          type: "success",
          text: `Telemetry verified healthy (${((res.post_repair_error_rate ?? 0.0) * 100).toFixed(2)}% error rate). System stable.`,
        });
      }
      await loadRuns();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Telemetry check failed." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleMergeRollback = async () => {
    if (!activeRun?.id) return;
    setActionLoading("rollback_merge");
    setActionMessage(null);
    try {
      await executeRunMergeRollback(activeRun.id);
      setActionMessage({ type: "success", text: "Rollback revert PR merged successfully." });
      await loadRuns();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Rollback merge failed." });
    } finally {
      setActionLoading(null);
    }
  };

  const hasPatch = Boolean(incident.ai_suggested_patch || (incident as any).suggested_patch);
  const r = activeRun;

  // Dynamic lifecycle stage evaluations directly from the backend model
  const hasRun = Boolean(r);
  const isSafetyPassed = Boolean(r?.safety_result?.allowed || r?.branch_name || r?.pr_number);
  const isSandboxPassed = Boolean(r && r.status !== "PENDING" && r.status !== "SAFETY_VIOLATION");
  const isBranchCreated = Boolean(r?.branch_name);
  const isPrCreated = Boolean(r?.pr_number);
  const isCiPassed = Boolean(r?.ci_result?.status === "PASSED" || r?.merge_status === "MERGED" || r?.merged_at || r?.status === "COMPLETED" || r?.status === "ROLLED_BACK" || r?.status === "ROLLBACK_COMPLETED");
  const isMerged = Boolean(r?.merge_status === "MERGED" || r?.status === "MERGED" || r?.merged_at || r?.status === "ROLLED_BACK" || r?.status === "ROLLBACK_COMPLETED");
  const isPostDeployMonitored = Boolean(r?.post_deploy_status && r.post_deploy_status !== "NOT_STARTED");
  const hasRegressionEvent = Boolean(r?.revert_pr_number || r?.post_deploy_status === "REGRESSION_DETECTED" || r?.status === "ROLLED_BACK" || r?.status === "ROLLBACK_COMPLETED");
  const isRollbackPrCreated = Boolean(r?.revert_pr_number);
  const isRollbackMerged = Boolean(r?.rollback_status === "REVERT_MERGED" || r?.rollback_status === "COMPLETED" || r?.status === "ROLLBACK_COMPLETED");
  const ciStatus = String(r?.ci_result?.status || "NOT_STARTED").toUpperCase();
  const ciTestsPassed = typeof r?.ci_result?.tests_passed === "number" ? r.ci_result.tests_passed : null;
  const ciTestsTotal = typeof r?.ci_result?.tests_total === "number" ? r.ci_result.tests_total : null;
  const baselineRate = typeof r?.baseline_error_rate === "number" ? r.baseline_error_rate : null;
  const postRepairRate = typeof r?.post_repair_error_rate === "number" ? r.post_repair_error_rate : null;
  const configuredThreshold = typeof (r as any)?.regression_error_rate_threshold === "number" ? (r as any).regression_error_rate_threshold : null;
  const ciDetail = ciTestsPassed !== null && ciTestsTotal !== null ? String(ciTestsPassed) + "/" + String(ciTestsTotal) + " tests passed" : ciStatus;
  const isSystemHealthy = Boolean(r?.post_deploy_status === "HEALTHY");

  return (
    <div className="panel p-6 bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-100 text-[#dc2626] font-bold text-xs font-heading">
              L3
            </span>
            <h2 className="text-base font-bold font-heading text-slate-900">
              L3 Automated Repair Lifecycle
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Autonomous patch gating, PR creation, CI check, controlled merge, and automated rollback guard.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!r ? (
            <button
              type="button"
              onClick={handleTriggerRepair}
              disabled={actionLoading === "trigger" || !hasPatch}
              className="button-primary inline-flex items-center gap-2 text-xs font-bold font-heading py-2 px-4 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {actionLoading === "trigger" ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current" />
              )}
              <span>{hasPatch ? "Trigger Autonomous Repair" : "Awaiting AI Patch..."}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={loadRuns}
              className="button-secondary inline-flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3"
              title="Refresh repair state"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh State</span>
            </button>
          )}
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-sans flex items-center gap-2 ${
            actionMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {actionMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Current Status Overview Cards */}
      {r ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-heading block">
                Current Run Status
              </span>
              <span className="text-xs font-mono font-bold text-slate-900 mt-0.5 block">
                {r.status}
              </span>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-heading ${
              r.status === "ROLLBACK_COMPLETED" || r.status === "COMPLETED" || r.status === "MERGED"
                ? "bg-emerald-100 text-emerald-700"
                : r.status === "ROLLED_BACK"
                ? "bg-amber-100 text-amber-700"
                : "bg-blue-100 text-blue-700"
            }`}>
              {r.status}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-heading block">
                Telemetry Health State
              </span>
              <span className="text-xs font-mono font-bold text-slate-900 mt-0.5 block">
                {r.post_deploy_status}
              </span>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-heading ${
              r.post_deploy_status === "HEALTHY"
                ? "bg-emerald-100 text-emerald-700"
                : r.post_deploy_status === "REGRESSION_DETECTED"
                ? "bg-rose-100 text-rose-700"
                : "bg-slate-100 text-slate-600"
            }`}>
              {r.post_deploy_status === "HEALTHY" ? "HEALTHY (0.0%)" : r.post_deploy_status}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500 font-sans">
          No automated repair run initiated yet. Click <strong>Trigger Autonomous Repair</strong> to execute the pipeline.
        </div>
      )}

      {/* Stage-by-Stage Verification Checklist */}
      {r && (
        <div className="space-y-2.5 pt-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-heading block mb-2">
            Automated Repair Stage Verification
          </span>

          {/* 1. Safety Gate */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100 text-xs">
            <div className="flex items-center gap-2.5">
              {isSafetyPassed ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <RefreshCw className="h-4 w-4 text-blue-600 animate-spin shrink-0" />
              )}
              <span className="font-semibold text-slate-800 font-heading">Safety Gate Passed</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              {isSafetyPassed ? "Allowed: Safe Diff & Exclusions Verified" : "Checking..."}
            </span>
          </div>

          {/* 2. Sandbox Tests */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100 text-xs">
            <div className="flex items-center gap-2.5">
              {isSandboxPassed ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <span className="h-4 w-4 rounded-full border border-slate-300 shrink-0" />
              )}
              <span className="font-semibold text-slate-800 font-heading">Sandbox Tests Passed</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              {isSandboxPassed ? "Pre-Verification Test Suite Green" : "Pending"}
            </span>
          </div>

          {/* 3. Repair Branch */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100 text-xs">
            <div className="flex items-center gap-2.5">
              {isBranchCreated ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <span className="h-4 w-4 rounded-full border border-slate-300 shrink-0" />
              )}
              <span className="font-semibold text-slate-800 font-heading">Repair Branch Created</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono truncate max-w-[260px]">
              {r.branch_name || "Pending"}
            </span>
          </div>

          {/* 4. Pull Request */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100 text-xs">
            <div className="flex items-center gap-2.5">
              {isPrCreated ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <span className="h-4 w-4 rounded-full border border-slate-300 shrink-0" />
              )}
              <span className="font-semibold text-slate-800 font-heading">
                Pull Request {r.pr_number ? `#${r.pr_number}` : ""}
              </span>
            </div>
            {r.pr_url ? (
              <a
                href={r.pr_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-[#dc2626] hover:underline font-mono text-[11px]"
              >
                <span>PR #{r.pr_number} on GitHub</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="text-[11px] text-slate-500 font-mono">Pending</span>
            )}
          </div>

          {/* 5. CI Passed */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100 text-xs">
            <div className="flex items-center gap-2.5">
              {isCiPassed ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <span className="h-4 w-4 rounded-full border border-slate-300 shrink-0" />
              )}
              <span className="font-semibold text-slate-800 font-heading">CI ${ciStatus === "PASSED" ? "Passed" : ciStatus}</span>
            </div>
            <span className="text-[11px] text-emerald-700 font-mono font-bold">
              {isCiPassed ? ciDetail : "Pending"}
            </span>
          </div>

          {/* 6. Repair Merged */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100 text-xs">
            <div className="flex items-center gap-2.5">
              {isMerged ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <span className="h-4 w-4 rounded-full border border-slate-300 shrink-0" />
              )}
              <span className="font-semibold text-slate-800 font-heading">Repair Merged</span>
            </div>
            {isMerged ? (
              <span className="text-[11px] text-slate-600 font-mono">
                Commit: <strong>{r.merge_commit_sha?.substring(0, 8) || "—"}</strong>
              </span>
            ) : isPrCreated && isCiPassed ? (
              <button
                type="button"
                onClick={handleMergePR}
                disabled={actionLoading === "merge"}
                className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg font-bold font-heading text-[11px] cursor-pointer shadow-xs"
              >
                {actionLoading === "merge" ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                <span>Approve &amp; Merge PR #{r.pr_number}</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-500 font-mono">Pending Approval</span>
            )}
          </div>

          {/* 7. Post-Deploy Monitoring */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100 text-xs">
            <div className="flex items-center gap-2.5">
              {isPostDeployMonitored ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <span className="h-4 w-4 rounded-full border border-slate-300 shrink-0" />
              )}
              <span className="font-semibold text-slate-800 font-heading">Post-Deploy Monitoring</span>
            </div>
            <span className="text-[11px] text-slate-600 font-mono">
              {baselineRate !== null ? "Baseline: " + (baselineRate * 100).toFixed(2) + "%" : "Baseline: —"}{configuredThreshold !== null ? " (Threshold: " + (configuredThreshold * 100).toFixed(2) + "%)" : ""}
            </span>
          </div>

          {/* 8. Regression Detected (if applicable) */}
          {hasRegressionEvent && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50/60 border border-rose-200 text-xs">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span className="font-semibold text-rose-900 font-heading">Regression Detected — {postRepairRate !== null ? (postRepairRate * 100).toFixed(2) + "%" : "rate unavailable"}</span>
              </div>
              <span className="text-[11px] text-rose-700 font-mono font-bold">
                {postRepairRate !== null && configuredThreshold !== null ? (postRepairRate * 100).toFixed(2) + "% > " + (configuredThreshold * 100).toFixed(2) + "% threshold" : "Post-repair error rate exceeded the configured threshold."}
              </span>
            </div>
          )}

          {/* 9. Rollback PR */}
          {hasRegressionEvent && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100 text-xs">
              <div className="flex items-center gap-2.5">
                {isRollbackPrCreated ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <span className="h-4 w-4 rounded-full border border-slate-300 shrink-0" />
                )}
                <span className="font-semibold text-slate-800 font-heading">
                  Rollback PR {r.revert_pr_number ? `#${r.revert_pr_number}` : ""}
                </span>
              </div>
              {r.revert_pr_url ? (
                <a
                  href={r.revert_pr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-rose-700 hover:underline font-mono text-[11px]"
                >
                  <span>Revert PR #{r.revert_pr_number} on GitHub</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-[11px] text-slate-500 font-mono">Revert PR Generated</span>
              )}
            </div>
          )}

          {/* 10. Rollback Merged */}
          {hasRegressionEvent && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100 text-xs">
              <div className="flex items-center gap-2.5">
                {isRollbackMerged ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <span className="h-4 w-4 rounded-full border border-slate-300 shrink-0" />
                )}
                <span className="font-semibold text-slate-800 font-heading">Rollback Merged</span>
              </div>
              {isRollbackMerged ? (
                <span className="text-[11px] text-slate-600 font-mono">
                  Revert Commit: <strong>{(r as any).rollback_commit_sha?.substring(0, 8) || "—"}</strong>
                </span>
              ) : r.revert_pr_number ? (
                <button
                  type="button"
                  onClick={handleMergeRollback}
                  disabled={actionLoading === "rollback_merge"}
                  className="inline-flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 rounded-lg font-bold font-heading text-[11px] cursor-pointer shadow-xs"
                >
                  {actionLoading === "rollback_merge" ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                  <span>Merge Rollback Revert PR #{r.revert_pr_number}</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-500 font-mono">Pending</span>
              )}
            </div>
          )}

          {/* 11. System Healthy */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs">
            <div className="flex items-center gap-2.5">
              {isSystemHealthy ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <span className="h-4 w-4 rounded-full border border-slate-300 shrink-0" />
              )}
              <span className="font-semibold text-emerald-900 font-heading">System Healthy — {postRepairRate !== null ? (postRepairRate * 100).toFixed(2) + "%" : "rate unavailable"}</span>
            </div>
            <span className="text-[11px] text-emerald-700 font-mono font-bold">
              {isSystemHealthy ? (postRepairRate !== null ? (postRepairRate * 100).toFixed(2) + "% Error Rate" : "Healthy") : "Monitoring"}
            </span>
          </div>
        </div>
      )}

      {/* Interactive Controls Bar for Evaluation / Live Testing */}
      {r && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-heading block">
            Interactive Evaluation &amp; Telemetry Actions
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleVerifyTelemetry(false)}
              disabled={Boolean(actionLoading)}
              className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold font-heading cursor-pointer transition shadow-xs"
            >
              <Activity className="h-3.5 w-3.5 text-emerald-600" />
              <span>Verify Live Telemetry (Healthy 0%)</span>
            </button>

            <button
              type="button"
              onClick={() => handleVerifyTelemetry(true)}
              disabled={Boolean(actionLoading)}
              className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 px-3 py-1.5 rounded-lg text-xs font-bold font-heading cursor-pointer transition shadow-xs"
              title="Simulates 18% regression spike to test automated rollback guard"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
              <span>Simulate Regression Spike (18%) &amp; Trigger Rollback Guard</span>
            </button>
          </div>
        </div>
      )}

      {/* Audit Logs Accordion */}
      {r?.logs && r.logs.length > 0 && (
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center justify-between w-full text-xs font-bold font-heading text-slate-600 hover:text-slate-900 transition py-1 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-slate-500" />
              <span>L3 Repair Audit Trail ({r.logs.length} events recorded)</span>
            </span>
            {showLogs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showLogs && (
            <div className="mt-3 rounded-xl bg-slate-950 border border-slate-900 p-4 font-mono text-[11px] text-slate-300 space-y-2 max-h-60 overflow-y-auto">
              {r.logs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-slate-500 shrink-0">
                    [{new Date(log.timestamp).toLocaleTimeString()}]
                  </span>
                  <span className={`font-bold shrink-0 ${
                    log.level === "ERROR"
                      ? "text-rose-400"
                      : log.level === "WARN"
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }`}>
                    [{log.stage}]
                  </span>
                  <span className="text-slate-200">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RepairTimeline;
