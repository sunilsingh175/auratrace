"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Server,
  Plus,
  Copy,
  Check,
  Search,
  Radio,
  X,
  Activity,
  Trash2,
  Pencil,
  AlertTriangle,
  Cpu,
  Clock,
  Sparkles,
  ExternalLink,
  Code2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/context/auth-context";
import { fetchServices, updateService, deleteService, fetchProjects } from "@/lib/api-client";
import { Service, Project } from "@/types";

function formatMetric(value: number, suffix = "") {
  return Number.isFinite(value) && value > 0 ? `${value}${suffix}` : "—";
}

function timeAgo(dateString?: string) {
  if (!dateString) return "Never";
  try {
    const d = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 10) return "Just now";
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  } catch {
    return dateString;
  }
}

function getRuntimeColor(runtime?: string) {
  const r = (runtime || "node").toLowerCase();
  if (r.includes("node") || r.includes("js") || r.includes("ts")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (r.includes("python") || r.includes("py")) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  if (r.includes("go")) {
    return "bg-cyan-50 text-cyan-700 border-cyan-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export default function ServicesPage() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Connect Service Modal State
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedProjectKey, setSelectedProjectKey] = useState("");
  const [activeSdkTab, setActiveSdkTab] = useState<"node" | "python" | "curl">("node");
  const [copiedKey, setCopiedKey] = useState(false);

  // Edit Modal State
  const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);
  const [editName, setEditName] = useState("");
  const [editEnv, setEditEnv] = useState("production");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete Modal State
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [svcData, projData] = await Promise.all([
        fetchServices(),
        fetchProjects().catch(() => []),
      ]);
      setServices(svcData);
      setProjects(projData);
      if (projData.length > 0) {
        setSelectedProjectKey(projData[0].api_key || "");
      }
    } catch (err) {
      console.error(err);
      setError("Unable to load services from the backend API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const openEditModal = (svc: Service) => {
    setServiceToEdit(svc);
    setEditName(svc.name);
    setEditEnv(svc.environment || "production");
    setEditStatus((svc.status || "ACTIVE").toUpperCase());
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceToEdit || !editName.trim()) return;

    setEditSubmitting(true);
    setError(null);

    try {
      const updated = await updateService(serviceToEdit.id, {
        name: editName.trim(),
        environment: editEnv,
        status: editStatus,
      });

      setServices((prev) =>
        prev.map((s) =>
          s.id === serviceToEdit.id
            ? {
                ...s,
                name: updated.name || editName.trim(),
                environment: updated.environment || editEnv,
                status: (updated.status || editStatus).toLowerCase() as any,
              }
            : s
        )
      );

      setActionSuccess(`Service "${editName.trim()}" updated successfully.`);
      setTimeout(() => setActionSuccess(null), 4000);
      setServiceToEdit(null);
    } catch (err) {
      console.error(err);
      setError("Failed to update service. You may only modify services you own.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteService = async () => {
    if (!serviceToDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteService(serviceToDelete.id);
      setServices((prev) => prev.filter((s) => s.id !== serviceToDelete.id));
      setActionSuccess(`Service "${serviceToDelete.name}" was removed from the fleet.`);
      setTimeout(() => setActionSuccess(null), 4000);
      setServiceToDelete(null);
    } catch (err) {
      console.error(err);
      setError("Failed to delete service. You may only delete services you own.");
    } finally {
      setDeleting(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
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
      (s.service_id && s.service_id.toLowerCase().includes(q)) ||
      s.environment.toLowerCase().includes(q) ||
      (s.runtime && s.runtime.toLowerCase().includes(q))
    );
  });

  const canManageService = (svc: Service) => {
    if (!user) return false;
    if (user.role === "Admin") return true;
    if (user.role === "Developer" && svc.owner_id && svc.owner_id === user.id) return true;
    return false;
  };

  return (
    <AppShell hideHeaderTitle>
      <div className="space-y-6">
        {/* Header */}
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
              Automatically Detected Services
            </h1>
            <p className="mt-1 text-xs text-slate-500 max-w-2xl font-sans">
              Services automatically discovered and registered via the AuraTrace SDK. Zero manual configuration required.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter services by name, id, runtime..."
                className="w-full rounded-xl border border-slate-200 bg-[#f1f4f9] py-2 pl-9 pr-4 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:bg-white"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowConnectModal(true)}
              className="button-primary shrink-0 inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Connect New Service</span>
            </button>
          </div>
        </div>

        {/* Action Notifications */}
        {actionSuccess && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 font-sans">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>{actionSuccess}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
            <span>{error}</span>
            <button type="button" onClick={() => void loadData()} className="font-bold hover:underline">
              Retry
            </button>
          </div>
        )}

        {/* Fleet Grid */}
        {loading ? (
          <div className="panel p-12 text-center text-xs text-slate-400 font-mono">
            Loading live microservices topology...
          </div>
        ) : filtered.length === 0 ? (
          <div className="panel p-12 text-center">
            <Server className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-700 font-heading">No Microservices Detected Yet</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Install the AuraTrace SDK in your Node.js or Python application and start streaming telemetry. It will
              appear here automatically.
            </p>
            <button
              type="button"
              onClick={() => setShowConnectModal(true)}
              className="button-primary mt-4 inline-flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              <span>Get SDK Setup Snippet</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((svc) => {
              const normStatus = (svc.status || "active").toLowerCase();
              const isCrit = normStatus === "critical" || normStatus === "degraded";
              const isWarn = normStatus === "warning" || normStatus === "inactive";
              const hasTelemetry = svc.requests > 0 || svc.latency_ms > 0 || svc.error_rate > 0;
              const hasManagePermission = canManageService(svc);
              const isOwner = Boolean(user && svc.owner_id === user.id);
              const runtimeLabel = svc.runtime || "node";

              return (
                <div
                  key={svc.id}
                  className="panel group relative flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-md hover:border-slate-200"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate font-mono text-xs font-bold text-red-600">
                          {svc.service_id || svc.id}
                        </span>
                        <span
                          className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase font-mono ${getRuntimeColor(
                            runtimeLabel
                          )}`}
                        >
                          {runtimeLabel}
                        </span>
                        {svc.version && (
                          <span className="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 font-mono">
                            v{svc.version}
                          </span>
                        )}
                        <span className="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-600">
                          {svc.environment}
                        </span>
                        {isOwner && (
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 border border-blue-200">
                            Owned
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1.5 truncate text-sm font-bold text-slate-900 font-heading transition group-hover:text-red-600">
                        {svc.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
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

                      {hasManagePermission && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(svc)}
                            title="Edit Service"
                            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setServiceToDelete(svc)}
                            title="Delete Service"
                            className="rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metrics Snapshot */}
                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-slate-100 bg-[#f8fafc] p-3 text-center">
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-heading">
                        Requests
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-800">
                        {hasTelemetry ? svc.requests.toLocaleString() : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-heading">
                        Error Rate
                      </span>
                      <span
                        className={`font-mono text-xs font-bold ${
                          svc.error_rate > 3 ? "text-rose-600" : hasTelemetry ? "text-emerald-600" : "text-slate-400"
                        }`}
                      >
                        {hasTelemetry ? `${svc.error_rate.toFixed(1)}%` : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-heading">
                        P95 Latency
                      </span>
                      <span
                        className={`font-mono text-xs font-bold ${
                          svc.latency_ms > 500 ? "text-rose-600" : hasTelemetry ? "text-slate-800" : "text-slate-400"
                        }`}
                      >
                        {formatMetric(svc.latency_ms, "ms")}
                      </span>
                    </div>
                  </div>

                  {/* Auto-Discovery Timestamps */}
                  <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 font-sans">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Last seen: {timeAgo(svc.last_seen_at || svc.last_activity)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3 text-slate-400" />
                      <span>{hasTelemetry ? "Streaming" : "Discovered"}</span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]">
                    <span className="text-slate-500 font-sans">
                      {svc.incident_count > 0 ? (
                        <strong className="text-rose-600">{svc.incident_count} open incidents</strong>
                      ) : (
                        "0 active incidents"
                      )}
                    </span>
                    <Link
                      href={`/telemetry?service=${encodeURIComponent(svc.service_id || svc.id)}`}
                      className="inline-flex items-center gap-1 font-bold text-red-600 transition hover:text-red-700 font-heading"
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

        {/* CONNECT A SERVICE MODAL */}
        {showConnectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="panel w-full max-w-xl border-slate-200 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 font-heading">Connect New Service</h2>
                    <p className="text-[11px] text-slate-400">Zero-config automatic discovery via AuraTrace SDKs</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Project Key Selection */}
              <div>
                <label className="text-xs font-bold text-slate-700 font-heading block mb-1">
                  1. Select Project &amp; Ingestion Key
                </label>
                {projects.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedProjectKey}
                      onChange={(e) => setSelectedProjectKey(e.target.value)}
                      className="field flex-1 font-mono text-xs"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.api_key || ""}>
                          {p.name} ({(p.api_key || "").slice(0, 16)}...)
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedProjectKey)}
                      className="button-secondary shrink-0 inline-flex items-center gap-1 text-xs"
                    >
                      {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedKey ? "Copied" : "Copy Key"}</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                    No active projects found. You can use the default demo key:{" "}
                    <code className="font-mono font-bold">at_live_production_aura_key_001</code>
                  </div>
                )}
              </div>

              {/* SDK Language Tabs */}
              <div>
                <label className="text-xs font-bold text-slate-700 font-heading block mb-2">
                  2. Integrate SDK in Application
                </label>
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <button
                    type="button"
                    onClick={() => setActiveSdkTab("node")}
                    className={`text-xs font-bold font-heading px-3 py-1.5 rounded-lg transition ${
                      activeSdkTab === "node"
                        ? "bg-red-600 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Node.js / Express
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSdkTab("python")}
                    className={`text-xs font-bold font-heading px-3 py-1.5 rounded-lg transition ${
                      activeSdkTab === "python"
                        ? "bg-red-600 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Python / FastAPI
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSdkTab("curl")}
                    className={`text-xs font-bold font-heading px-3 py-1.5 rounded-lg transition ${
                      activeSdkTab === "curl"
                        ? "bg-red-600 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    cURL / REST API
                  </button>
                </div>

                <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-200 leading-relaxed overflow-x-auto shadow-inner">
                  {activeSdkTab === "node" && (
                    <pre>
                      <code>
                        <span className="text-slate-500"># 1. Install SDK</span>
                        {"\n"}
                        <span className="text-amber-300">npm install @auratrace/node</span>
                        {"\n\n"}
                        <span className="text-slate-500"># 2. Add to app entrypoint</span>
                        {"\n"}
                        <span className="text-purple-400">import</span> &#123;{" "}
                        <span className="text-amber-300">AuraTrace</span> &#125;{" "}
                        <span className="text-purple-400">from</span>{" "}
                        <span className="text-emerald-300">&apos;@auratrace/node&apos;</span>;
                        {"\n\n"}
                        <span className="text-amber-300">AuraTrace</span>.
                        <span className="text-blue-400">init</span>(&#123;
                        {"\n"}  apiKey:{" "}
                        <span className="text-emerald-300">
                          &quot;{selectedProjectKey || "at_live_production_aura_key_001"}&quot;
                        </span>,
                        {"\n"}&#125;);
                        {"\n\n"}
                        <span className="text-slate-500">// Track Express routes &amp; unhandled crashes</span>
                        {"\n"}
                        <span className="text-slate-300">app.</span>
                        <span className="text-blue-400">use</span>(
                        <span className="text-amber-300">AuraTrace</span>.
                        <span className="text-blue-400">expressMiddleware</span>());
                      </code>
                    </pre>
                  )}

                  {activeSdkTab === "python" && (
                    <pre>
                      <code>
                        <span className="text-slate-500"># 1. Install SDK</span>
                        {"\n"}
                        <span className="text-amber-300">pip install auratrace</span>
                        {"\n\n"}
                        <span className="text-slate-500"># 2. Add to main.py</span>
                        {"\n"}
                        <span className="text-purple-400">import</span>{" "}
                        <span className="text-blue-300">auratrace</span>
                        {"\n\n"}
                        <span className="text-blue-300">auratrace</span>.
                        <span className="text-blue-400">init</span>(
                        {"\n"}  api_key=
                        <span className="text-emerald-300">
                          &quot;{selectedProjectKey || "at_live_production_aura_key_001"}&quot;
                        </span>
                        {"\n"})
                      </code>
                    </pre>
                  )}

                  {activeSdkTab === "curl" && (
                    <pre>
                      <code>
                        <span className="text-slate-500"># Direct Telemetry Ingestion</span>
                        {"\n"}
                        curl -X POST http://localhost:8000/api/v1/telemetry \
                        {"\n"}  -H &quot;X-Project-Key:{" "}
                        {selectedProjectKey || "at_live_production_aura_key_001"}&quot; \
                        {"\n"}  -H &quot;Content-Type: application/json&quot; \
                        {"\n"}  -d &apos;&#123;
                        {"\n"}    &quot;service_name&quot;: &quot;billing-service&quot;,
                        {"\n"}    &quot;runtime&quot;: &quot;python&quot;,
                        {"\n"}    &quot;version&quot;: &quot;1.2.0&quot;,
                        {"\n"}    &quot;latency_ms&quot;: 145,
                        {"\n"}    &quot;status_code&quot;: 200
                        {"\n"}  &#125;&apos;
                      </code>
                    </pre>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <Link
                  href="/projects"
                  onClick={() => setShowConnectModal(false)}
                  className="text-xs font-bold text-red-600 hover:underline inline-flex items-center gap-1 font-heading"
                >
                  <span>Manage Project Keys</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>

                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="button-primary"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EDIT SERVICE MODAL */}
        {serviceToEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="panel w-full max-w-md border-slate-200 p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Pencil className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 font-heading">Edit Service Metadata</h2>
                    <p className="text-[10px] text-slate-400 font-mono">ID: {serviceToEdit.service_id || serviceToEdit.id}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setServiceToEdit(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateService} className="mt-4 space-y-4">
                <div>
                  <label className="label font-heading">Display Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="field mt-1.5"
                  />
                </div>
                <div>
                  <label className="label font-heading">Deployment Environment</label>
                  <select
                    value={editEnv}
                    onChange={(e) => setEditEnv(e.target.value)}
                    className="field mt-1.5"
                  >
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                  </select>
                </div>
                <div>
                  <label className="label font-heading">Service Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="field mt-1.5"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="DEGRADED">DEGRADED</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    disabled={editSubmitting}
                    onClick={() => setServiceToEdit(null)}
                    className="button-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="button-primary"
                  >
                    {editSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {serviceToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="panel w-full max-w-sm border-slate-200 p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-heading">Delete Microservice</h3>
                  <p className="text-xs text-slate-500">This action cannot be undone.</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to remove service <strong className="text-slate-900">{serviceToDelete.name}</strong> (<code className="font-mono text-red-600">{serviceToDelete.service_id || serviceToDelete.id}</code>) from the monitored fleet?
              </p>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setServiceToDelete(null)}
                  className="button-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteService}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50 font-heading"
                >
                  {deleting ? "Deleting..." : "Delete Service"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
