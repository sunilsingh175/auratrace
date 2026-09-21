"use client";

import React from "react";
import Link from "next/link";
import { Package, Clock, AlertTriangle, ChevronRight, CheckCircle2 } from "lucide-react";
import { Service, Incident } from "@/types";

interface OverviewPanelsProps {
  services?: Service[];
  incidents?: Incident[];
}

export function OverviewPanels({ services = [], incidents = [] }: OverviewPanelsProps) {
  const activeServices = (services || []).slice(0, 5);
  const activeIncidents = (incidents || []).slice(0, 5);

  const timelineItems = (incidents || []).slice(0, 5).map((inc) => {
    const time = inc.created_at
      ? new Date(inc.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "Just now";
    const isCrit = inc.severity === "critical" || (inc.anomaly_score && inc.anomaly_score >= 0.85);
    const isWarn = inc.severity === "high" || inc.severity === "medium";

    return {
      id: inc.id,
      time,
      title: inc.title || inc.error_type || "Anomaly Detected",
      meta: `${inc.service_id} · Score: ${(inc.anomaly_score ?? 0).toFixed(2)}`,
      tone: isCrit ? "red" : isWarn ? "yellow" : "green",
      status: inc.status,
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Panel 1: Service Health Overview */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-500" />
              <h3 className="font-heading font-bold text-slate-900 text-sm">
                Service Health Overview
              </h3>
            </div>
            <Link
              href="/services"
              className="text-xs text-slate-400 hover:text-slate-800 transition-colors font-medium"
            >
              View all
            </Link>
          </div>

          {activeServices.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-sans">
              <Package className="mx-auto h-7 w-7 text-slate-300 mb-2" />
              <p className="font-medium text-slate-600">No active microservices</p>
              <Link href="/services" className="text-red-600 font-bold hover:underline mt-1 block">
                Register a microservice →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {activeServices.map((srv) => {
                const isHealthy = srv.status === "healthy";
                const isCrit = srv.status === "critical";

                return (
                  <div
                    key={srv.id}
                    className="py-3 flex items-center justify-between text-xs hover:bg-slate-50/60 px-1 rounded-xl transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isHealthy
                            ? "bg-emerald-500"
                            : isCrit
                            ? "bg-red-500"
                            : "bg-amber-500"
                        }`}
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 block truncate">
                          {srv.name}
                        </span>
                        <span
                          className={`text-[10px] font-mono capitalize ${
                            isHealthy
                              ? "text-slate-400"
                              : isCrit
                              ? "text-red-600"
                              : "text-amber-600"
                          }`}
                        >
                          {srv.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5 text-[11px] text-slate-500 font-mono">
                      <span className="hidden sm:inline">
                        {srv.requests > 0 ? `${(srv.requests / 300).toFixed(1)} rps` : "0 rps"}
                      </span>
                      <span className={srv.error_rate > 3 ? "text-rose-600 font-bold" : ""}>
                        {srv.error_rate ? `${srv.error_rate.toFixed(1)}%` : "0%"}
                      </span>
                      <span className="w-14 text-right">
                        {srv.latency_ms > 0 ? `${srv.latency_ms.toFixed(0)} ms` : "—"}
                      </span>
                      <Link href={`/telemetry?service=${encodeURIComponent(srv.id)}`} className="text-slate-400 hover:text-slate-700">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Panel 2: Anomaly Timeline */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <h3 className="font-heading font-bold text-slate-900 text-sm">
                Anomaly Timeline
              </h3>
            </div>
            <Link
              href="/telemetry"
              className="text-xs text-slate-400 hover:text-slate-800 transition-colors font-medium"
            >
              View all
            </Link>
          </div>

          {timelineItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-sans">
              <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-400 mb-2" />
              <p className="font-medium text-slate-600">All systems normal</p>
              <p className="text-[11px] text-slate-400 mt-0.5">No anomaly triggers in recent events</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {timelineItems.map((item) => (
                <div
                  key={item.id}
                  className="py-3 flex items-start gap-3 text-xs hover:bg-slate-50/60 px-1 rounded-xl transition"
                >
                  <span
                    className={`w-2 h-2 rounded-full mt-1 shrink-0 ${
                      item.tone === "red"
                        ? "bg-red-500"
                        : item.tone === "yellow"
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                  />
                  <span className="text-slate-400 font-mono text-[11px] w-12 shrink-0">
                    {item.time}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 text-xs truncate">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {item.meta}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Panel 3: Recent Incidents */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-slate-500" />
              <h3 className="font-heading font-bold text-slate-900 text-sm">
                Recent Incidents
              </h3>
            </div>
            <Link
              href="/incidents"
              className="text-xs text-slate-400 hover:text-slate-800 transition-colors font-medium"
            >
              View all
            </Link>
          </div>

          {activeIncidents.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-sans">
              <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-500 mb-2" />
              <p className="font-medium text-slate-700 font-heading">Zero open incidents</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Microservice anomaly detector is idle</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 text-xs">
              {activeIncidents.map((inc) => {
                const isCrit = inc.severity === "critical" || (inc.anomaly_score && inc.anomaly_score >= 0.85);
                const isWarn = inc.severity === "high" || inc.severity === "medium";
                const isResolved = inc.status === "RESOLVED";

                return (
                  <Link
                    key={inc.id}
                    href={`/incidents/${encodeURIComponent(inc.id)}`}
                    className="py-2.5 flex items-center justify-between hover:bg-slate-50/60 px-1 rounded-xl transition block"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="font-mono text-[10px] text-slate-400 block truncate">
                        {inc.id.slice(0, 12)}
                      </span>
                      <span className="font-bold text-slate-900 block truncate text-xs">
                        {inc.title || inc.error_type || inc.service_id}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isCrit
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : isWarn
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {inc.severity || "Anomaly"}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isResolved
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {inc.status}
                      </span>

                      <span className="font-mono text-[10px] text-slate-400 w-12 text-right">
                        {inc.created_at
                          ? new Date(inc.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
