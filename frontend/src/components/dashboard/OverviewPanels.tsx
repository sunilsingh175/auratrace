"use client";

import React from "react";
import Link from "next/link";
import { Package, Clock, AlertTriangle, ChevronRight } from "lucide-react";
import { Service, Incident } from "@/types";

interface OverviewPanelsProps {
  services?: Service[];
  incidents?: Incident[];
}

export function OverviewPanels({ services, incidents }: OverviewPanelsProps) {
  // Default fallback services if backend services are initializing
  const defaultServices = [
    { name: "auth-service", status: "Healthy", rps: "12.4 rps", error: "0.1%", latency: "98 ms" },
    { name: "payment-service", status: "Healthy", rps: "8.7 rps", error: "0.3%", latency: "145 ms" },
    { name: "user-service", status: "Degraded", rps: "6.2 rps", error: "1.8%", latency: "220 ms" },
    { name: "notification-service", status: "Healthy", rps: "3.1 rps", error: "0.2%", latency: "110 ms" },
    { name: "catalog-service", status: "Down", rps: "0.0 rps", error: "0.0%", latency: "-" },
  ];

  const defaultTimeline = [
    {
      time: "12:42",
      title: "Increased error rate detected",
      meta: "user-service · Anomaly score: 0.82",
      tone: "red",
    },
    {
      time: "12:37",
      title: "Latency spike detected",
      meta: "payment-service · Anomaly score: 0.76",
      tone: "yellow",
    },
    {
      time: "12:21",
      title: "Normalized",
      meta: "auth-service · Anomaly score: 0.34",
      tone: "green",
    },
    {
      time: "11:58",
      title: "Increased error rate detected",
      meta: "notification-service · Anomaly score: 0.71",
      tone: "yellow",
    },
    {
      time: "11:34",
      title: "Normalized",
      meta: "catalog-service · Anomaly score: 0.29",
      tone: "green",
    },
  ];

  const defaultIncidents = [
    {
      id: "INC-00124",
      service: "user-service",
      severity: "High",
      status: "Open",
      time: "12:42",
    },
    {
      id: "INC-00123",
      service: "payment-service",
      severity: "Medium",
      status: "Investigating",
      time: "12:37",
    },
    {
      id: "INC-00122",
      service: "catalog-service",
      severity: "Critical",
      status: "Open",
      time: "11:58",
    },
    {
      id: "INC-00121",
      service: "notification-service",
      severity: "Low",
      status: "Resolved",
      time: "10:24",
    },
    {
      id: "INC-00120",
      service: "auth-service",
      severity: "Medium",
      status: "Resolved",
      time: "09:17",
    },
  ];

  const activeServices =
    services && services.length > 0
      ? services.slice(0, 5).map((s) => ({
          name: s.name,
          status: s.status === "healthy" ? "Healthy" : s.status === "critical" ? "Down" : "Degraded",
          rps: `${(Math.random() * 10 + 2).toFixed(1)} rps`,
          error: `${s.error_rate ?? 0}%`,
          latency: `${s.latency_ms ?? 0} ms`,
        }))
      : defaultServices;

  const activeIncidents =
    incidents && incidents.length > 0
      ? incidents.slice(0, 5).map((inc) => ({
          id: inc.id,
          service: inc.service_id ? inc.service_id.split("-")[0] + "-service" : "api-gateway",
          severity: inc.severity,
          status: inc.status,
          time: new Date(inc.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }))
      : defaultIncidents;

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

          <div className="divide-y divide-slate-50">
            {activeServices.map((srv, idx) => (
              <div
                key={idx}
                className="py-3 flex items-center justify-between text-xs hover:bg-slate-50/60 px-1 rounded-xl transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      srv.status === "Healthy"
                        ? "bg-emerald-500"
                        : srv.status === "Degraded"
                        ? "bg-amber-500"
                        : "bg-red-500"
                    }`}
                  />
                  <div>
                    <span className="font-bold text-slate-900 block truncate">
                      {srv.name}
                    </span>
                    <span
                      className={`text-[11px] font-medium ${
                        srv.status === "Healthy"
                          ? "text-slate-400"
                          : srv.status === "Degraded"
                          ? "text-amber-600"
                          : "text-red-600"
                      }`}
                    >
                      {srv.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 text-[11px] text-slate-500 font-mono">
                  <span className="hidden sm:inline">{srv.rps}</span>
                  <span>{srv.error}</span>
                  <span className="w-14 text-right">{srv.latency}</span>
                  <Link href="/services" className="text-slate-400 hover:text-slate-700">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
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

          <div className="divide-y divide-slate-50">
            {defaultTimeline.map((item, idx) => (
              <div
                key={idx}
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
                <span className="text-slate-400 font-mono text-[11px] w-10 shrink-0">
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

          <div className="divide-y divide-slate-50 text-xs">
            {activeIncidents.map((inc, idx) => (
              <div
                key={idx}
                className="py-2.5 flex items-center justify-between hover:bg-slate-50/60 px-1 rounded-xl transition"
              >
                <div className="min-w-0 pr-2">
                  <span className="font-mono text-[11px] text-slate-400 block">
                    {inc.id}
                  </span>
                  <span className="font-bold text-slate-900 block truncate text-xs">
                    {inc.service}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Severity Badge */}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      inc.severity === "Critical"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : inc.severity === "High"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : inc.severity === "Medium"
                        ? "bg-yellow-50 text-yellow-800 border border-yellow-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {inc.severity}
                  </span>

                  {/* Status Badge */}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      inc.status === "Open"
                        ? "bg-orange-50 text-orange-700 border border-orange-200"
                        : inc.status === "Investigating"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {inc.status}
                  </span>

                  <span className="font-mono text-[11px] text-slate-400 w-10 text-right">
                    {inc.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
