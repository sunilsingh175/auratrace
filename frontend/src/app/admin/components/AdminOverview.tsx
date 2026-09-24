"use client";

import React from "react";
import { Users, FolderKanban, Activity, ShieldCheck, RefreshCw } from "lucide-react";
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
  stats,
  refreshing,
  onRefresh,
}: AdminOverviewProps) {
  const totalUsersCount = users.length;
  const totalProjectsCount = projects.length;
  const totalCrashesCount = stats?.total_incidents_count ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
          Platform Overview
        </h2>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-900 transition font-heading cursor-pointer"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin text-[#dc2626]" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Users */}
        <div className="panel p-5 bg-white border-slate-100 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
              Users
            </span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900">
            {totalUsersCount}
          </p>
        </div>

        {/* Card 2: Projects */}
        <div className="panel p-5 bg-white border-slate-100 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
              Projects
            </span>
            <FolderKanban className="h-4 w-4 text-purple-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900">
            {totalProjectsCount}
          </p>
        </div>

        {/* Card 3: Crashes */}
        <div className="panel p-5 bg-white border-slate-100 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
              Crashes
            </span>
            <Activity className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900">
            {totalCrashesCount}
          </p>
        </div>

        {/* Card 4: System */}
        <div className="panel p-5 bg-emerald-50/40 border-emerald-200/80 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 font-heading">
              System
            </span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-emerald-700">
            Healthy
          </p>
        </div>
      </div>
    </div>
  );
}
