"use client";

import React from "react";
import Link from "next/link";
import { Server, ArrowRight, Activity, AlertCircle, Cpu } from "lucide-react";
import { Service } from "@/types";

interface MonitoredServicesPanelProps {
  services: Service[];
}

function getRuntimeBadge(runtime?: string) {
  const r = (runtime || "node").toLowerCase();
  if (r.includes("node") || r.includes("js") || r.includes("ts")) {
    return { label: "Node.js", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  }
  if (r.includes("python") || r.includes("py")) {
    return { label: "Python", color: "bg-blue-50 text-blue-700 border-blue-200" };
  }
  if (r.includes("go")) {
    return { label: "Go", color: "bg-cyan-50 text-cyan-700 border-cyan-200" };
  }
  return { label: runtime || "Microservice", color: "bg-slate-100 text-slate-700 border-slate-200" };
}

export function MonitoredServicesPanel({ services }: MonitoredServicesPanelProps) {
  const serviceCount = services.length;

  return (
    <div className="panel p-6 bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-extrabold text-lg text-slate-900 tracking-tight">
                Automatically Detected Services Fleet
              </h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 font-heading">
                {serviceCount}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Microservices automatically discovered by AuraTrace SDKs streaming live telemetry.
            </p>
          </div>
        </div>

        <Link
          href="/services"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#dc2626] hover:text-[#b91c1c] transition font-heading shrink-0"
        >
          <span>View All Services</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Table / List */}
      {serviceCount > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-heading">
                <th className="pb-3 pr-4">Service</th>
                <th className="pb-3 px-4">Runtime</th>
                <th className="pb-3 px-4">Environment</th>
                <th className="pb-3 px-4">Status</th>
                <th className="pb-3 px-4">Requests</th>
                <th className="pb-3 px-4">Error Rate</th>
                <th className="pb-3 px-4">Latency</th>
                <th className="pb-3 pl-4 text-right">Incidents</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {services.map((svc) => {
                const isHealthy = svc.status === "active" || svc.status === "healthy" || !svc.status;
                const env = svc.environment || "production";
                const requests = svc.requests !== undefined ? svc.requests : "0";
                const errorRate =
                  svc.error_rate !== undefined
                    ? `${svc.error_rate.toFixed(2)}%`
                    : "0.00%";
                const latency =
                  svc.latency_ms !== undefined
                    ? `${Math.round(svc.latency_ms)} ms`
                    : "0 ms";
                const incidentCount = svc.incident_count ?? 0;
                const runtimeBadge = getRuntimeBadge(svc.runtime);

                return (
                  <tr key={svc.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600">
                          <Server className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <span className="font-heading font-bold text-slate-900 block">
                            {svc.name}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 block">
                            {svc.service_id || svc.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-bold font-mono ${runtimeBadge.color}`}
                      >
                        {runtimeBadge.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 font-heading uppercase">
                        {env}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold font-heading ${
                          isHealthy
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isHealthy ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                          }`}
                        />
                        {isHealthy ? "Healthy" : "Degraded"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {requests}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {errorRate}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {latency}
                    </td>
                    <td className="py-3.5 pl-4 text-right">
                      {incidentCount > 0 ? (
                        <span className="rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700 font-heading">
                          {incidentCount} open
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center rounded-xl border border-dashed border-slate-200">
          <Server className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-600 font-sans">
            No microservices detected yet. Start your application with the AuraTrace SDK to auto-discover.
          </p>
        </div>
      )}
    </div>
  );
}
