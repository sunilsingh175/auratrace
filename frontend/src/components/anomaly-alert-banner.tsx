"use client";

import React from "react";
import Link from "next/link";
import { AlertOctagon, ArrowRight, X, Sparkles } from "lucide-react";
import { AnomalyAlertEvent } from "@/hooks/use-websocket";

interface AnomalyAlertBannerProps {
  alert: AnomalyAlertEvent | null;
  onDismiss: () => void;
}

export function AnomalyAlertBanner({ alert, onDismiss }: AnomalyAlertBannerProps) {
  if (!alert) return null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-rose-500/60 bg-gradient-to-r from-rose-950/90 via-red-950/80 to-purple-950/90 p-4 shadow-2xl backdrop-blur-md animate-pulse-fast">
      {/* Background radial glow */}
      <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-rose-500/20 blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40 shrink-0">
            <AlertOctagon className="w-6 h-6 animate-bounce" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white tracking-wide uppercase">
                Anomaly Detected
              </span>
              <span className="text-xs text-rose-300 font-mono">
                Score: {(alert.anomaly_score * 100).toFixed(0)}%
              </span>
              <span className="text-xs text-slate-400 font-mono">
                [{alert.service_id}]
              </span>
            </div>

            <h4 className="text-sm font-semibold text-slate-100 mt-1">
              {alert.error_type || "System Metric Deviation"}:{" "}
              <span className="text-slate-300 font-normal">{alert.reason || alert.message}</span>
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          {alert.incident_id && (
            <Link
              href={`/incidents/${alert.incident_id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Diagnostics
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}

          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
