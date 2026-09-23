"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FolderKanban,
  Plus,
  Key,
  Copy,
  Check,
  RefreshCw,
  Server,
  ArrowRight,
  Code2,
  AlertTriangle,
  X,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/context/auth-context";
import { fetchProjects, createProject, regenerateProjectKey } from "@/lib/api-client";
import { Project } from "@/types";

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Create Project Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);

  // Regenerate Key State
  const [projectToRegen, setProjectToRegen] = useState<Project | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  // Copied state per project id
  const [copiedKeyMap, setCopiedKeyMap] = useState<Record<string, boolean>>({});

  // Active quickstart tab
  const [activeTab, setActiveTab] = useState<"node" | "python" | "curl">("node");

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProjects();
      setProjects(data);
    } catch (err) {
      console.error(err);
      setError("Unable to load AuraTrace projects. Please verify backend connectivity.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setCreating(true);
    setError(null);
    try {
      const created = await createProject({ name: newProjectName.trim() });
      setProjects((prev) => [created, ...prev]);
      setShowCreateModal(false);
      setNewProjectName("");
      setActionSuccess(`Project "${created.name}" created successfully with live API Key.`);
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err) {
      console.error(err);
      setError("Failed to create project. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!projectToRegen) return;
    setRegenerating(true);
    setError(null);
    try {
      const updated = await regenerateProjectKey(projectToRegen.id);
      setProjects((prev) =>
        prev.map((p) => (p.id === projectToRegen.id ? { ...p, api_key: updated.api_key } : p))
      );
      setActionSuccess(`Ingestion key for "${projectToRegen.name}" regenerated.`);
      setTimeout(() => setActionSuccess(null), 5000);
      setProjectToRegen(null);
    } catch (err) {
      console.error(err);
      setError("Failed to regenerate API key.");
    } finally {
      setRegenerating(false);
    }
  };

  const copyKey = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKeyMap((prev) => ({ ...prev, [id]: true }));
      setTimeout(() => {
        setCopiedKeyMap((prev) => ({ ...prev, [id]: false }));
      }, 2000);
    } catch {
      // Fallback
    }
  };

  const activeProject = projects[0];

  return (
    <AppShell hideHeaderTitle>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <FolderKanban className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
                AuraTrace Workspaces
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 font-heading md:text-3xl">
              Projects &amp; API Keys
            </h1>
            <p className="mt-1 text-xs text-slate-500 max-w-2xl font-sans">
              Create and manage AuraTrace projects. Telemetry SDKs use the Project API Key to stream data and
              automatically register microservices with zero manual configuration.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setNewProjectName("");
              setShowCreateModal(true);
            }}
            className="button-primary shrink-0 inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Project</span>
          </button>
        </div>

        {/* Notifications / Error Banner */}
        {actionSuccess && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 font-sans">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
            <span>{error}</span>
            <button type="button" onClick={() => void loadProjects()} className="font-bold hover:underline">
              Retry
            </button>
          </div>
        )}

        {/* Projects List */}
        {loading ? (
          <div className="panel p-12 text-center text-xs text-slate-400 font-mono">
            Loading AuraTrace project keys...
          </div>
        ) : projects.length === 0 ? (
          <div className="panel p-12 text-center">
            <FolderKanban className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-700 font-heading">No Projects Found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Create your first project to receive an Ingestion API Key and start streaming automatic service telemetry.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="button-primary mt-4 inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create First Project</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Project Cards */}
            <div className="lg:col-span-2 space-y-4">
              {projects.map((project) => {
                const isCopied = Boolean(copiedKeyMap[project.id]);
                return (
                  <div
                    key={project.id}
                    className="panel p-6 bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600 font-heading font-bold text-xs">
                            <Key className="h-4 w-4" />
                          </div>
                          <div>
                            <h2 className="text-base font-bold text-slate-900 font-heading truncate">
                              {project.name}
                            </h2>
                            <p className="text-[10px] text-slate-400 font-mono">
                              ID: {project.id} • Created {new Date(project.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href="/services"
                          className="rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700 font-heading inline-flex items-center gap-1.5 hover:bg-slate-100 transition"
                        >
                          <Server className="h-3.5 w-3.5 text-slate-500" />
                          <span>{project.service_count ?? 0} Services</span>
                        </Link>
                      </div>
                    </div>

                    {/* API Key Box */}
                    <div className="mt-5 rounded-xl border border-slate-200 bg-[#f8fafc] p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-heading">
                          Ingestion API Key
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setProjectToRegen(project)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 transition"
                            title="Regenerate API Key"
                          >
                            <RefreshCw className="h-3 w-3" />
                            <span>Rotate Key</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2.5 font-mono text-xs text-slate-800 shadow-2xs">
                        <span className="truncate select-all">{project.api_key}</span>
                        <button
                          type="button"
                          onClick={() => copyKey(project.id, project.api_key || "")}
                          className="ml-3 shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition flex items-center gap-1 text-[11px] font-sans font-medium"
                        >
                          {isCopied ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                              <span className="text-emerald-700 font-bold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: Interactive Quickstart Guide */}
            <div className="panel p-6 bg-slate-950 text-white border-slate-800 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider font-heading mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-red-400" />
                  <span>SDK Quickstart</span>
                </div>
                <h2 className="text-base font-bold font-heading text-white">
                  Zero-Config Auto Discovery
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Install the SDK, supply your Project API Key, and start your app. AuraTrace automatically discovers
                  your services.
                </p>

                {/* Tabs */}
                <div className="flex items-center gap-2 mt-4 border-b border-slate-800 pb-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("node")}
                    className={`text-xs font-bold font-heading px-3 py-1 rounded-lg transition ${
                      activeTab === "node"
                        ? "bg-red-600 text-white"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    Node.js
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("python")}
                    className={`text-xs font-bold font-heading px-3 py-1 rounded-lg transition ${
                      activeTab === "python"
                        ? "bg-red-600 text-white"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    Python
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("curl")}
                    className={`text-xs font-bold font-heading px-3 py-1 rounded-lg transition ${
                      activeTab === "curl"
                        ? "bg-red-600 text-white"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    HTTP / cURL
                  </button>
                </div>

                {/* Tab Content */}
                <div className="mt-4 font-mono text-xs leading-relaxed">
                  {activeTab === "node" && (
                    <div className="space-y-3">
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-slate-300">
                        <span className="text-slate-500"># 1. Install SDK</span>
                        <br />
                        npm install @auratrace/node
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-slate-300">
                        <span className="text-slate-500"># 2. Add to app entry</span>
                        <br />
                        <span className="text-purple-400">import</span> &#123; AuraTrace &#125;{" "}
                        <span className="text-purple-400">from</span>{" "}
                        <span className="text-emerald-400">&apos;@auratrace/node&apos;</span>;
                        <br />
                        <br />
                        AuraTrace.<span className="text-blue-400">init</span>(&#123;
                        <br />
                        &nbsp;&nbsp;apiKey:{" "}
                        <span className="text-amber-300">&quot;{activeProject?.api_key || "at_live_..."}&quot;</span>,
                        <br />
                        &#125;);
                        <br />
                        <br />
                        <span className="text-slate-500">// Express middleware</span>
                        <br />
                        app.<span className="text-blue-400">use</span>(AuraTrace.
                        <span className="text-blue-400">expressMiddleware</span>());
                      </div>
                    </div>
                  )}

                  {activeTab === "python" && (
                    <div className="space-y-3">
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-slate-300">
                        <span className="text-slate-500"># 1. Install SDK</span>
                        <br />
                        pip install auratrace
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-slate-300">
                        <span className="text-slate-500"># 2. Add to your app</span>
                        <br />
                        <span className="text-purple-400">import</span> auratrace
                        <br />
                        <br />
                        auratrace.<span className="text-blue-400">init</span>(
                        <br />
                        &nbsp;&nbsp;api_key=
                        <span className="text-amber-300">&quot;{activeProject?.api_key || "at_live_..."}&quot;</span>
                        <br />
                        )
                      </div>
                    </div>
                  )}

                  {activeTab === "curl" && (
                    <div className="space-y-3">
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-slate-300 break-all">
                        <span className="text-slate-500"># Ingest endpoint</span>
                        <br />
                        curl -X POST http://localhost:8000/api/v1/telemetry \
                        <br />
                        &nbsp;&nbsp;-H &quot;X-Project-Key: {activeProject?.api_key || "at_live_..."}&quot; \
                        <br />
                        &nbsp;&nbsp;-H &quot;Content-Type: application/json&quot; \
                        <br />
                        &nbsp;&nbsp;-d &apos;&#123;&quot;service_name&quot;:&quot;billing-service&quot;,&quot;runtime&quot;:&quot;python&quot;,&quot;latency_ms&quot;:120&#125;&apos;
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-sans">Automatic AI diagnostics included</span>
                <Link
                  href="/services"
                  className="inline-flex items-center gap-1 font-bold text-red-400 hover:text-red-300 transition font-heading"
                >
                  <span>View Services Fleet</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* CREATE PROJECT MODAL */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="panel w-full max-w-md border-slate-200 p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-600">
                    <FolderKanban className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 font-heading">Create AuraTrace Project</h2>
                    <p className="text-[10px] text-slate-400">Generate a new project with its own Ingestion Key</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="mt-4 space-y-4">
                <div>
                  <label className="label font-heading">Project Name</label>
                  <input
                    type="text"
                    required
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g. Acme Production Ecosystem"
                    className="field mt-1.5"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="button-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="button-primary"
                  >
                    {creating ? "Creating..." : "Create Project"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* REGENERATE KEY MODAL */}
        {projectToRegen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="panel w-full max-w-sm border-slate-200 p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-amber-600">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-heading">Rotate Ingestion Key</h3>
                  <p className="text-xs text-slate-500">Existing SDK clients will need the new key.</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to regenerate the API key for project{" "}
                <strong className="text-slate-900">{projectToRegen.name}</strong>?
              </p>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  disabled={regenerating}
                  onClick={() => setProjectToRegen(null)}
                  className="button-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={regenerating}
                  onClick={handleRegenerate}
                  className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 font-heading"
                >
                  {regenerating ? "Regenerating..." : "Regenerate Key"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
