"use client";

import Link from "next/link";
import { AlertOctagon, ArrowRight, Sparkles, X } from "lucide-react";
import { AnomalyAlertEvent } from "@/hooks/use-websocket";

export function AnomalyAlertBanner({ alert, onDismiss }: { alert: AnomalyAlertEvent | null; onDismiss: () => void }) {
  if (!alert) return null;
  return (
    <div className="relative overflow-hidden rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 shadow-lg">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-500/25 bg-rose-500/10 text-rose-300"><AlertOctagon className="h-5 w-5" /></span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">Anomaly detected</span>
              <span className="font-mono text-[10px] text-rose-300">Score {(alert.anomaly_score * 100).toFixed(0)}%</span>
              <span className="font-mono text-[10px] text-slate-500">[{alert.service_id}]</span>
            </div>
            <p className="mt-1 truncate text-xs font-semibold text-slate-200">{alert.error_type || "System metric deviation"}: <span className="font-normal text-slate-400">{alert.reason || alert.message || "Anomaly detected in telemetry"}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
          {alert.incident_id && <Link href={`/incidents/${alert.incident_id}`} className="button-primary !bg-rose-500 hover:!bg-rose-400"><Sparkles className="h-3.5 w-3.5" /> AI Diagnostics <ArrowRight className="h-3.5 w-3.5" /></Link>}
          <button onClick={onDismiss} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-800 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}
