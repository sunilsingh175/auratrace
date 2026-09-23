"use client";

import React from "react";
import { Users, FolderKanban, Activity, CheckCircle2, RefreshCw } from "lucide-react";
import { UserAccount, Project, InfrastructureStatus, SystemStats } from "@/types";

interface AdminOverviewProps {
  users: UserAccount[];
  projects: Project[];
  health: InfrastructureStatus | null;
  stats: SystemStats | null;
  refreshing: boolean;
  onRefresh: () => void;
}

export function AdminOverview({
  users,
  projects,
  health,
  stats,
  refreshing,
  onRefresh,
}: AdminOverviewProps) {
  const isSystemHealthy =
    health?.api_status === "healthy" &&
    health?.postgres_status === "healthy" &&
    health?.redis_status === "healthy";

  const totalCrashesCount = stats?.total_incidents_count ?? 0;
  const telemetryLogsCount = stats?.total_logs_ingested ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
          Platform Overview
        </h2>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 transition font-heading cursor-pointer"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin text-[#dc2626]" : ""}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="panel p-5 bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
              Total Users
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold font-heading text-slate-900">{users.length}</p>
          <p className="mt-1 text-[11px] text-slate-400 font-sans">Registered accounts</p>
        </div>

        <div className="panel p-5 bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
              Active Projects
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <FolderKanban className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold font-heading text-slate-900">{projects.length}</p>
          <p className="mt-1 text-[11px] text-slate-400 font-sans">Workspaces provisioned</p>
        </div>

        <div className="panel p-5 bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
              Total Crashes
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-[#dc2626]">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold font-heading text-slate-900">
            {totalCrashesCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-400 font-sans">
            {telemetryLogsCount} telemetry logs ({stats?.open_incidents_count ?? 0} open)
          </p>
        </div>

        <div className="panel p-5 bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
              System Status
            </span>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                isSystemHealthy ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isSystemHealthy ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <p className="text-xl font-bold font-heading text-slate-900">
              {isSystemHealthy ? "All Healthy" : "Degraded"}
            </p>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-sans">
            {health?.active_ws_clients ?? 0} live stream consumers
          </p>
        </div>
      </div>
    </div>
  );
}
