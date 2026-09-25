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
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { fetchProjects, createProject, regenerateProjectKey } from "@/lib/api-client";
import { Project } from "@/types";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Quick project creator
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Copied states
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedNodeInstall, setCopiedNodeInstall] = useState(false);
  const [copiedPythonInstall, setCopiedPythonInstall] = useState(false);
  const [copiedNodeCode, setCopiedNodeCode] = useState(false);
  const [copiedPythonCode, setCopiedPythonCode] = useState(false);

  const [regenerating, setRegenerating] = useState(false);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProjects();
      setProjects(data);
    } catch (err) {
      console.error(err);
      setError("Unable to load Automatic Backend Detection projects.");
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
      setProjects([created, ...projects]);
      setNewProjectName("");
      setShowCreateForm(false);
      setActionSuccess(`Project "${created.name}" created.`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      console.error(err);
      setError("Failed to create project.");
    } finally {
      setCreating(false);
    }
  };

  const activeProject = projects[0];
  const hasRealKey = Boolean(activeProject?.api_key);
  const displayKey = activeProject?.api_key || "A7K92M481X63P205";

  const handleRegenerateKey = async () => {
    if (!activeProject) return;
    setRegenerating(true);
    try {
      const res = await regenerateProjectKey(activeProject.id);
      setProjects((prev) =>
        prev.map((p) => (p.id === activeProject.id ? { ...p, api_key: res.api_key } : p))
      );
      setActionSuccess("API key regenerated.");
      setTimeout(() => setActionSuccess(null), 4000);
    } catch {
      setError("Failed to regenerate API key.");
    } finally {
      setRegenerating(false);
    }
  };

  const copyApiKey = async () => {
    if (!activeProject?.api_key) {
      await handleRegenerateKey();
      return;
    }
    try {
      await navigator.clipboard.writeText(activeProject.api_key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {
      // Fallback
    }
  };

  const copyText = async (text: string, type: "node-install" | "python-install" | "node-code" | "python-code") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "node-install") {
        setCopiedNodeInstall(true);
        setTimeout(() => setCopiedNodeInstall(false), 2000);
      } else if (type === "python-install") {
        setCopiedPythonInstall(true);
        setTimeout(() => setCopiedPythonInstall(false), 2000);
      } else if (type === "node-code") {
        setCopiedNodeCode(true);
        setTimeout(() => setCopiedNodeCode(false), 2000);
      } else if (type === "python-code") {
        setCopiedPythonCode(true);
        setTimeout(() => setCopiedPythonCode(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  const nodeInitCode = `import { AuraTrace } from "@auratrace/node";

AuraTrace.init({
  apiKey: process.env.AURATRACE_API_KEY
});`;

  const pythonInitCode = `import auratrace
import os

auratrace.init(
  api_key=os.getenv("AURATRACE_API_KEY")
)`;

  return (
    <AppShell hideHeaderTitle>
      <div className="w-full space-y-6 pb-16">
        {/* Top Header Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
              SDK Setup &amp; Workspaces
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="button-secondary active:scale-95 transition-all cursor-pointer font-heading flex items-center gap-2"
          >
            <Plus className="h-4 w-4 text-slate-600" />
            <span>{showCreateForm ? "Cancel" : "New Project"}</span>
          </button>
        </div>

        {/* Feedback Alerts */}
        {actionSuccess && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 font-sans">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
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

        {/* Create Project Form (if toggled) */}
        {(showCreateForm || (!loading && projects.length === 0)) && (
          <div className="panel p-6 bg-white border-slate-200 shadow-sm animate-in fade-in duration-200">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-heading">
              Create New Project
            </h2>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Enter a name for your application project to generate a dedicated API key.
            </p>
            <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g. AuraTrace Demo"
                className="flex-1 rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-2.5 text-xs font-semibold text-slate-900 outline-none transition focus:border-red-500 focus:bg-white"
              />
              <button
                type="submit"
                disabled={creating || !newProjectName.trim()}
                className="button-primary shrink-0 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                <span>{creating ? "Creating..." : "Create Project"}</span>
              </button>
            </form>
          </div>
        )}

        {/* 1. Your Project & API Key */}
        <div className="panel p-6 bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
              Your Project
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-base font-bold text-slate-900 font-heading">
                {loading ? "Loading..." : activeProject?.name || "AuraTrace Demo"}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-heading">
                  API Key
                </span>
                {hasRealKey && (
                  <button
                    type="button"
                    onClick={handleRegenerateKey}
                    disabled={regenerating}
                    className="text-[11px] text-slate-400 hover:text-slate-600 font-mono flex items-center gap-1 transition cursor-pointer"
                    title="Regenerate Key"
                  >
                    <RefreshCw className={`h-3 w-3 ${regenerating ? "animate-spin" : ""}`} />
                    <span>Regenerate</span>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Key className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="font-mono text-sm font-bold tracking-wider text-slate-800 truncate">
                    {displayKey}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={copyApiKey}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 hover:border-slate-300 transition shadow-xs font-heading cursor-pointer shrink-0"
                >
                  {copiedKey ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-500" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Install AuraTrace */}
        <div className="panel p-6 bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading border-b border-slate-100 pb-3">
            Install AuraTrace
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Node.js install */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-800 font-heading">
                Node.js
              </span>
              <div className="flex items-center justify-between rounded-xl bg-slate-900 border border-slate-800 px-4 py-2.5 font-mono text-xs text-slate-200">
                <code>npm install @auratrace/node</code>
                <button
                  type="button"
                  onClick={() => copyText("npm install @auratrace/node", "node-install")}
                  className="text-slate-400 hover:text-white transition cursor-pointer ml-2"
                  title="Copy command"
                >
                  {copiedNodeInstall ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Python install */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-800 font-heading">
                Python
              </span>
              <div className="flex items-center justify-between rounded-xl bg-slate-900 border border-slate-800 px-4 py-2.5 font-mono text-xs text-slate-200">
                <code>pip install auratrace-sdk</code>
                <button
                  type="button"
                  onClick={() => copyText("pip install auratrace-sdk", "python-install")}
                  className="text-slate-400 hover:text-white transition cursor-pointer ml-2"
                  title="Copy command"
                >
                  {copiedPythonInstall ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Initialize the SDK */}
        <div className="panel p-6 bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading border-b border-slate-100 pb-3">
            Initialize the SDK
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Node.js snippet */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 font-heading">
                  Node.js
                </span>
                <button
                  type="button"
                  onClick={() => copyText(nodeInitCode, "node-code")}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer font-heading"
                >
                  {copiedNodeCode ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-400" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="rounded-xl bg-slate-950 border border-slate-900 p-4 font-mono text-xs text-slate-200 leading-relaxed overflow-x-auto">
                <pre className="whitespace-pre-wrap">{nodeInitCode}</pre>
              </div>
            </div>

            {/* Python snippet */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 font-heading">
                  Python
                </span>
                <button
                  type="button"
                  onClick={() => copyText(pythonInitCode, "python-code")}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer font-heading"
                >
                  {copiedPythonCode ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-400" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="rounded-xl bg-slate-950 border border-slate-900 p-4 font-mono text-xs text-slate-200 leading-relaxed overflow-x-auto">
                <pre className="whitespace-pre-wrap">{pythonInitCode}</pre>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Complete footer card */}
        <div className="panel p-6 bg-gradient-to-r from-slate-900 to-slate-950 border-slate-800 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
              <h3 className="text-base font-bold font-heading text-white">
                Automatic Service Discovery
              </h3>
            </div>
            <p className="text-xs text-slate-300 font-sans max-w-lg leading-relaxed">
              Minimal configuration setup. Once initialized, AuraTrace automatically registers your microservice, captures unhandled exceptions, and streams AI diagnostics in real time.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white px-5 py-2.5 text-xs font-bold font-heading shadow-xs transition cursor-pointer"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
