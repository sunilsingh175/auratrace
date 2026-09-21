"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Server,
  Plus,
  Key,
  Copy,
  Check,
  Search,
  Radio,
  X,
  Activity,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { fetchServices, registerService } from "@/lib/api-client";
import { Service } from "@/types";

function formatMetric(value: number, suffix = "") {
  return Number.isFinite(value) && value > 0 ? `${value}${suffix}` : "—";
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newServiceId, setNewServiceId] = useState("");
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceEnv, setNewServiceEnv] = useState("production");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadServices = async () => {
    setLoading(true);
    setError(null);
    try {
      setServices(await fetchServices());
    } catch (err) {
      console.error(err);
      setError("Unable to load services from the AuraTrace API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadServices();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceId.trim() || !newServiceName.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await registerService({
        id: newServiceId.toLowerCase().replace(/[^a-z0-9_-]/g, "-"),
        name: newServiceName.trim(),
        environment: newServiceEnv,
      });

      setServices((prev) => [res, ...prev.filter((service) => service.id !== res.id)]);
      setCreatedKey(res.api_key_hash || null);
    } catch (err) {
      console.error(err);
      setError("Service registration failed. Check the AuraTrace API and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyKey = async (keyText: string) => {
    try {
      await navigator.clipboard.writeText(keyText);
      setCopiedKey(true);
      window.setTimeout(() => setCopiedKey(false), 2000);
    } catch {
      setCopiedKey(false);
    }
  };

  const filtered = services.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.environment.toLowerCase().includes(q)
    );
  });

  return (
    <AppShell
      title="Service Registry & Microservices"
      subtitle="Monitored service catalog, performance SLAs, and ingestion credentials"
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <Server className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
                Microservices Topology
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 font-heading md:text-3xl">
              Monitored Microservices
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter services..."
                className="w-full rounded-xl border border-slate-200 bg-[#f1f4f9] py-2 pl-9 pr-4 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:bg-white"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setCreatedKey(null);
                setNewServiceId("");
                setNewServiceName("");
                setNewServiceEnv("production");
                setError(null);
                setShowModal(true);
              }}
              className="button-primary"
            >
              <Plus className="h-4 w-4" />
              <span>Register Service</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
            <span>{error}</span>
            <button type="button" onClick={() => void loadServices()} className="font-bold hover:underline">
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="panel p-12 text-center text-xs text-slate-400 font-mono">
            Loading live microservices topology...
          </div>
        ) : filtered.length === 0 ? (
          <div className="panel p-12 text-center">
            <Server className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-700 font-heading">No microservices found</p>
            <p className="text-xs text-slate-400">
              {services.length === 0
                ? "No services are currently registered in the AuraTrace backend."
                : "Try adjusting your search query."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((svc) => {
              const isCrit = svc.status === "critical";
              const isWarn = svc.status === "warning";
              const hasTelemetry = svc.requests > 0 || svc.latency_ms > 0 || svc.error_rate > 0;

              return (
                <div
                  key={svc.id}
                  className="panel group relative flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-md hover:border-slate-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-mono text-xs font-bold text-red-600">{svc.id}</span>
                        <span className="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-600">
                          {svc.environment}
                        </span>
                      </div>
                      <h3 className="mt-1 truncate text-sm font-bold text-slate-900 font-heading transition group-hover:text-red-600">
                        {svc.name}
                      </h3>
                    </div>

                    <span
                      className={`ml-3 flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        isCrit
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : isWarn
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isCrit ? "bg-rose-500" : isWarn ? "bg-amber-500" : "animate-pulse bg-emerald-500"
                        }`}
                      />
                      <span>{svc.status}</span>
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-slate-100 bg-[#f8fafc] p-3 text-center">
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-heading">Requests</span>
                      <span className="font-mono text-xs font-bold text-slate-800">
                        {hasTelemetry ? svc.requests.toLocaleString() : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-heading">Error Rate</span>
                      <span
                        className={`font-mono text-xs font-bold ${
                          svc.error_rate > 3 ? "text-rose-600" : hasTelemetry ? "text-emerald-600" : "text-slate-400"
                        }`}
                      >
                        {hasTelemetry ? `${svc.error_rate.toFixed(1)}%` : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-heading">P95 Latency</span>
                      <span
                        className={`font-mono text-xs font-bold ${
                          svc.latency_ms > 500 ? "text-rose-600" : hasTelemetry ? "text-slate-800" : "text-slate-400"
                        }`}
                      >
                        {formatMetric(svc.latency_ms, "ms")}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
                    <Activity className="h-3 w-3" />
                    <span>{hasTelemetry ? "Recent telemetry available" : "No recent telemetry"}</span>
                  </div>

                  {svc.api_key_hash && (
                    <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-[#f1f4f9] px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Key className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate font-mono text-[10px] text-slate-600">Credential available</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyKey(svc.api_key_hash!)}
                        className="ml-2 shrink-0 text-slate-400 transition hover:text-slate-800"
                        title="Copy credential"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]">
                    <span className="text-slate-500">
                      {svc.incident_count > 0 ? (
                        <strong className="text-rose-600">{svc.incident_count} open incidents</strong>
                      ) : (
                        "0 active incidents"
                      )}
                    </span>
                    <Link
                      href={`/telemetry?service=${encodeURIComponent(svc.id)}`}
                      className="inline-flex items-center gap-1 font-bold text-red-600 transition hover:text-red-700"
                    >
                      <Radio className="h-3 w-3" />
                      <span>Inspect Stream</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="panel w-full max-w-md border-slate-200 p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-600">
                    <Server className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 font-heading">Register Microservice</h2>
                    <p className="text-[10px] text-slate-400">Add service to the AuraTrace telemetry stream</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {!createdKey ? (
                <form onSubmit={handleRegister} className="mt-4 space-y-4">
                  <div>
                    <label className="label font-heading">Service Identifier (slug)</label>
                    <input
                      type="text"
                      required
                      value={newServiceId}
                      onChange={(e) => setNewServiceId(e.target.value)}
                      placeholder="e.g. payment-service"
                      className="field mt-1.5 font-mono"
                    />
                  </div>
                  <div>
                    <label className="label font-heading">Display Name</label>
                    <input
                      type="text"
                      required
                      value={newServiceName}
                      onChange={(e) => setNewServiceName(e.target.value)}
                      placeholder="e.g. Stripe Payment Dispatcher"
                      className="field mt-1.5"
                    />
                  </div>
                  <div>
                    <label className="label font-heading">Deployment Environment</label>
                    <select
                      value={newServiceEnv}
                      onChange={(e) => setNewServiceEnv(e.target.value)}
                      className="field mt-1.5"
                    >
                      <option value="production">Production</option>
                      <option value="staging">Staging</option>
                      <option value="development">Development</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                    <button type="button" onClick={() => setShowModal(false)} className="button-secondary">
                      Cancel
                    </button>
                    <button type="submit" disabled={submitting} className="button-primary">
                      {submitting ? "Registering..." : "Create & Generate Key"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-5 space-y-4">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                    <Check className="mx-auto h-8 w-8 text-emerald-600" />
                    <h3 className="mt-2 text-sm font-bold text-slate-900 font-heading">Service Registered</h3>
                    <p className="mt-1 text-xs text-slate-600">
                      Store this credential securely. It is shown here only because the registration response supplied it.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-3">
                    <span className="label font-heading">AuraTrace Ingestion Credential</span>
                    <div className="mt-1.5 flex items-center justify-between font-mono text-xs text-slate-800">
                      <span className="truncate">{createdKey}</span>
                      <button
                        type="button"
                        onClick={() => copyKey(createdKey)}
                        className="ml-2 shrink-0 rounded-lg p-1 text-slate-400 hover:text-slate-800"
                        title="Copy credential"
                      >
                        {copiedKey ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setCreatedKey(null);
                    }}
                    className="button-primary w-full"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
