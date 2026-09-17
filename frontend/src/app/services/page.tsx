"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Server,
  Plus,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Key,
  Copy,
  Check,
  Search,
  ExternalLink,
  ShieldCheck,
  Radio,
  Trash2,
  X,
  Flame,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import {
  fetchServices,
  registerService,
  simulateCrash,
} from "@/lib/api-client";
import { Service } from "@/types";

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [newServiceId, setNewServiceId] = useState("");
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceEnv, setNewServiceEnv] = useState("production");

  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Crash simulator state
  const [simulatingService, setSimulatingService] = useState<string | null>(
    null
  );
  const [simulationMessage, setSimulationMessage] = useState<string | null>(
    null
  );

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const data = await fetchServices();
      setServices(data);
    } catch (error) {
      console.error("Failed to load services:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newServiceId || !newServiceName) return;

    setSubmitting(true);

    try {
      const res = await registerService({
        id: newServiceId
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, "-"),
        name: newServiceName,
        environment: newServiceEnv,
      });

      setServices((prev) => [res, ...prev]);

      setCreatedKey(
        res.api_key_hash ||
        `at_live_${Math.random()
          .toString(36)
          .substring(2, 16)}`
      );
    } catch (error) {
      console.error("Service registration failed:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSimulateCrash = async (serviceId: string) => {
    if (simulatingService) return;

    setSimulatingService(serviceId);
    setSimulationMessage(null);

    try {
      const result = await simulateCrash(
        serviceId,
        "db_pool_exhaustion"
      );

      console.log("Crash simulation dispatched:", result);

      setSimulationMessage(
        "Crash dispatched. Waiting for anomaly detection..."
      );

      /*
       * The pipeline is asynchronous:
       *
       * Button
       *   ↓
       * FastAPI
       *   ↓
       * Redis Stream
       *   ↓
       * ML Worker
       *   ↓
       * PostgreSQL
       *   ↓
       * RAG + Gemini
       *
       * Give the pipeline a few seconds and reload the
       * service statistics from the backend.
       */
      setTimeout(async () => {
        try {
          const updatedServices = await fetchServices();
          setServices(updatedServices);

          setSimulationMessage(
            "Crash processed. Check the Incidents page for the diagnosis."
          );
        } catch (refreshError) {
          console.error(
            "Failed to refresh services after simulation:",
            refreshError
          );
        } finally {
          setSimulatingService(null);
        }
      }, 4000);
    } catch (error) {
      console.error("Crash simulation failed:", error);

      setSimulationMessage(
        "Crash simulation failed. Check the backend logs."
      );

      setSimulatingService(null);
    }
  };

  const copyKey = (keyText: string) => {
    navigator.clipboard.writeText(keyText);
    setCopiedKey(true);

    setTimeout(() => {
      setCopiedKey(false);
    }, 2000);
  };

  const filtered = services.filter((s) => {
    const q = searchQuery.toLowerCase();

    return (
      s.name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.environment.toLowerCase().includes(q)
    );
  });

  return (
    <AppShell
      title="Service Registry & Microservices"
      subtitle="Monitored service catalog, performance SLAs, and ingestion API keys"
    >
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-cyan-400">
                <Server className="h-4 w-4" />
              </span>

              <span className="label">
                Microservices Topology
              </span>
            </div>

            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
              Monitored Microservices
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter services..."
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2 pl-9 pr-4 text-xs text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-blue-500"
              />
            </div>

            {/* Register Service */}
            <button
              type="button"
              onClick={() => {
                setCreatedKey(null);
                setNewServiceId("");
                setNewServiceName("");
                setNewServiceEnv("production");
                setShowModal(true);
              }}
              className="button-primary"
            >
              <Plus className="h-4 w-4" />
              <span>Register Service</span>
            </button>
          </div>
        </div>

        {/* Crash Simulator Notification */}
        {simulationMessage && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-rose-400" />

              <span>{simulationMessage}</span>

              <button
                type="button"
                onClick={() => setSimulationMessage(null)}
                className="ml-auto text-slate-500 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Services Grid */}
        {loading ? (
          <div className="panel p-12 text-center text-xs font-mono text-slate-500">
            Loading microservices topology...
          </div>
        ) : filtered.length === 0 ? (
          <div className="panel p-12 text-center">
            <Server className="mx-auto h-10 w-10 text-slate-700" />

            <p className="mt-3 text-sm font-bold text-slate-300">
              No microservices found
            </p>

            <p className="text-xs text-slate-500">
              Try adjusting your search query or register a new service.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((svc) => {
              const isCrit = svc.status === "critical";
              const isWarn = svc.status === "warning";

              const isSimulating =
                simulatingService === svc.id;

              return (
                <div
                  key={svc.id}
                  className="panel group relative flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-slate-700"
                >
                  {/* Top line with status and env */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-400">
                          {svc.id}
                        </span>

                        <span className="rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-300">
                          {svc.environment}
                        </span>
                      </div>

                      <h3 className="mt-1 text-sm font-bold text-white transition group-hover:text-cyan-300">
                        {svc.name}
                      </h3>
                    </div>

                    {/* Service status */}
                    <span
                      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${isCrit
                          ? "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30"
                          : isWarn
                            ? "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30"
                            : "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30"
                        }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${isCrit
                            ? "bg-rose-400"
                            : isWarn
                              ? "bg-amber-400"
                              : "animate-pulse bg-emerald-400"
                          }`}
                      />

                      <span>{svc.status}</span>
                    </span>
                  </div>

                  {/* Metrics Row */}
                  <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 text-center">
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-slate-500">
                        Requests
                      </span>

                      <span className="font-mono text-xs font-bold text-slate-200">
                        {svc.requests.toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-slate-500">
                        Error Rate
                      </span>

                      <span
                        className={`font-mono text-xs font-bold ${svc.error_rate > 3
                            ? "text-rose-400"
                            : "text-emerald-400"
                          }`}
                      >
                        {svc.error_rate.toFixed(1)}%
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-slate-500">
                        P95 Latency
                      </span>

                      <span
                        className={`font-mono text-xs font-bold ${svc.latency_ms > 500
                            ? "text-rose-400"
                            : "text-cyan-300"
                          }`}
                      >
                        {svc.latency_ms}ms
                      </span>
                    </div>
                  </div>

                  {/* API Key Box */}
                  {svc.api_key_hash && (
                    <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Key className="h-3.5 w-3.5 shrink-0 text-slate-500" />

                        <span className="truncate font-mono text-[10px] text-slate-400">
                          {svc.api_key_hash}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          copyKey(svc.api_key_hash!)
                        }
                        className="ml-2 shrink-0 text-slate-500 transition hover:text-white"
                        title="Copy Key"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Card Footer */}
                  <div className="mt-4 border-t border-slate-800/80 pt-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">
                        {svc.incident_count > 0 ? (
                          <strong className="text-rose-400">
                            {svc.incident_count} open incidents
                          </strong>
                        ) : (
                          "0 active incidents"
                        )}
                      </span>

                      <Link
                        href="/telemetry"
                        className="inline-flex items-center gap-1 font-bold text-cyan-400 transition hover:text-cyan-300"
                      >
                        <Radio className="h-3 w-3" />
                        <span>Inspect Stream</span>
                      </Link>
                    </div>

                    {/* Crash Simulator */}
                    {svc.id === "payment-api" && (
                      <button
                        type="button"
                        onClick={() =>
                          handleSimulateCrash(svc.id)
                        }
                        disabled={Boolean(simulatingService)}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-[11px] font-bold text-rose-400 transition hover:border-rose-500/50 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Flame
                          className={`h-3.5 w-3.5 ${isSimulating
                              ? "animate-pulse"
                              : ""
                            }`}
                        />

                        {isSimulating
                          ? "Simulating DB Pool Exhaustion..."
                          : "Simulate DB Pool Exhaustion"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Register Service Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <div className="panel w-full max-w-md border-blue-500/30 p-6 shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-cyan-400">
                    <Server className="h-4 w-4" />
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-white">
                      Register Microservice
                    </h2>

                    <p className="text-[10px] text-slate-500">
                      Add service to AuraTrace telemetry stream
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {!createdKey ? (
                <form
                  onSubmit={handleRegister}
                  className="mt-4 space-y-4"
                >
                  {/* Service ID */}
                  <div>
                    <label className="label">
                      Service Identifier (slug)
                    </label>

                    <input
                      type="text"
                      required
                      value={newServiceId}
                      onChange={(e) =>
                        setNewServiceId(e.target.value)
                      }
                      placeholder="e.g. payment-service"
                      className="field mt-1.5 font-mono"
                    />
                  </div>

                  {/* Display Name */}
                  <div>
                    <label className="label">
                      Display Name
                    </label>

                    <input
                      type="text"
                      required
                      value={newServiceName}
                      onChange={(e) =>
                        setNewServiceName(e.target.value)
                      }
                      placeholder="e.g. Stripe Payment Dispatcher"
                      className="field mt-1.5"
                    />
                  </div>

                  {/* Environment */}
                  <div>
                    <label className="label">
                      Deployment Environment
                    </label>

                    <select
                      value={newServiceEnv}
                      onChange={(e) =>
                        setNewServiceEnv(e.target.value)
                      }
                      className="field mt-1.5"
                    >
                      <option value="production">
                        Production
                      </option>

                      <option value="staging">
                        Staging
                      </option>

                      <option value="development">
                        Development
                      </option>
                    </select>
                  </div>

                  {/* Modal Buttons */}
                  <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="button-secondary"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="button-primary"
                    >
                      {submitting
                        ? "Registering..."
                        : "Create & Generate Key"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-5 space-y-4">
                  {/* Success */}
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />

                    <h3 className="mt-2 text-sm font-bold text-white">
                      Service Registered!
                    </h3>

                    <p className="mt-1 text-xs text-slate-300">
                      Include this API key in your service&apos;s
                      telemetry SDK initialization headers.
                    </p>
                  </div>

                  {/* API Key */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <span className="label">
                      AuraTrace Ingestion Key
                    </span>

                    <div className="mt-1.5 flex items-center justify-between font-mono text-xs text-cyan-300">
                      <span className="truncate">
                        {createdKey}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          copyKey(createdKey)
                        }
                        className="ml-2 shrink-0 rounded-lg p-1 text-slate-400 hover:text-white"
                      >
                        {copiedKey ? (
                          <Check className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Done */}
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
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