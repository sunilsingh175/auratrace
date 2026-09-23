"use client";

import React, { useState } from "react";
import { Sparkles, Play, RefreshCw, Trash2 } from "lucide-react";
import { simulateCrash, cleanTestData } from "@/lib/api-client";

interface AdminToolsProps {
  onRefreshHealth: () => void;
  isRefreshing: boolean;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export function AdminTools({
  onRefreshHealth,
  isRefreshing,
  onSuccess,
  onError,
}: AdminToolsProps) {
  const [simulating, setSimulating] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState("db_pool_exhaustion");
  const [cleaning, setCleaning] = useState(false);

  const handleSimulateCrash = async () => {
    setSimulating(true);
    try {
      const res = await simulateCrash(selectedScenario);
      onSuccess(res.message || `Simulated crash scenario '${selectedScenario}' dispatched.`);
      onRefreshHealth();
    } catch (err: any) {
      onError(err.message || "Failed to inject simulated crash.");
    } finally {
      setSimulating(false);
    }
  };

  const handleCleanTestData = async () => {
    setCleaning(true);
    try {
      const res = await cleanTestData();
      onRefreshHealth();
      onSuccess(res.message || `Test data cleaned. ${res.deleted_projects_count} test workspaces removed.`);
    } catch (err: any) {
      onError(err.message || "Failed to clean test data.");
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900 font-heading">
          Operational Admin Tools
        </h3>
        <p className="text-xs text-slate-500 font-sans mt-0.5">
          Execute maintenance tasks, trigger diagnostic crash simulations, or purge transient test data.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tool 1: Crash Simulation */}
        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/40 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold font-heading text-slate-900">
            <Sparkles className="h-4 w-4 text-[#dc2626]" />
            <span>Run Crash Simulation</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Inject realistic crash telemetry into the Redis Stream to test the ML anomaly pipeline and live UI notifications.
          </p>
          <div className="space-y-2">
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 font-sans focus:outline-none focus:border-red-500"
            >
              <option value="db_pool_exhaustion">Database Pool Timeout (QueuePool limit 10)</option>
              <option value="redis_consumer_lag">Redis Connection Refused</option>
              <option value="jwt_memory_leak">Memory Leak / High Heap Utilization</option>
              <option value="socket_timeout">HTTP Transport Timeout (30000ms)</option>
            </select>
            <button
              type="button"
              onClick={handleSimulateCrash}
              disabled={simulating}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white px-3 py-2 text-xs font-bold font-heading shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>{simulating ? "Injecting..." : "Simulate Crash"}</span>
            </button>
          </div>
        </div>

        {/* Tool 2: Refresh System Health */}
        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/40 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold font-heading text-slate-900">
            <RefreshCw className="h-4 w-4 text-blue-600" />
            <span>Refresh System Health</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Probe all cluster services (API, PostgreSQL pgvector, Redis, ML Worker, Ollama/LLM) and update telemetry counters.
          </p>
          <div className="pt-8">
            <button
              type="button"
              onClick={onRefreshHealth}
              disabled={isRefreshing}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 px-3 py-2 text-xs font-bold font-heading shadow-xs transition cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-[#dc2626]" : ""}`} />
              <span>{isRefreshing ? "Probing Cluster..." : "Refresh Health Sweep"}</span>
            </button>
          </div>
        </div>

        {/* Tool 3: Clean Test Data */}
        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/40 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold font-heading text-slate-900">
            <Trash2 className="h-4 w-4 text-amber-600" />
            <span>Clean Test Data</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Purge old automated test workspaces, transient synthetic services, and orphaned demo traces from the PostgreSQL database.
          </p>
          <div className="pt-8">
            <button
              type="button"
              onClick={handleCleanTestData}
              disabled={cleaning}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 px-3 py-2 text-xs font-bold font-heading shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{cleaning ? "Cleaning..." : "Purge Transient Data"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
