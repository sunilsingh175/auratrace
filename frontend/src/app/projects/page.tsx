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
      setProjects([created, ...projects]);
      setNewProjectName("");
      setShowCreateForm(false);
      setActionSuccess(`Project "${created.name}" created successfully.`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      console.error(err);
      setError("Failed to create project. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const activeProject = projects[0];
  const hasRealKey = Boolean(activeProject?.api_key);
  const displayKey = activeProject?.api_key || "••••••••••••••••••••";

  const handleRegenerateKey = async () => {
    if (!activeProject) return;
    setRegenerating(true);
    try {
      const res = await regenerateProjectKey(activeProject.id);
      setProjects((prev) =>
        prev.map((p) => (p.id === activeProject.id ? { ...p, api_key: res.api_key } : p))
      );
      setActionSuccess("API Key regenerated successfully. Copy and store it securely.");
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

  const nodeInitCode = `const AuraTrace = require("@auratrace/node");

AuraTrace.init({
  apiKey: process.env.AURATRACE_API_KEY
});`;

  const pythonInitCode = `import os
import auratrace

auratrace.init(
    api_key=os.getenv("AURATRACE_API_KEY")
)`;

  return (
    <AppShell hideHeaderTitle>
      <div className="page-container max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <FolderKanban className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
                Zero-Config SDK Integration
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 font-heading sm:text-3xl">
              Projects &amp; Setup
            </h1>
            <p className="mt-1 text-xs text-slate-500 font-sans">
              Create project → Copy API key → Install SDK → Initialize SDK → AuraTrace automatically discovers the application.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="button-secondary active:scale-95 transition-all cursor-pointer font-heading flex items-center gap-2 self-start sm:self-auto"
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

        {/* Create Project Form (if toggled or no projects) */}
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

        {/* Section 1: Your Project */}
        <div className="panel space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
              Your Project
            </h2>
            {projects.length > 1 && (
              <span className="text-xs text-slate-400 font-mono">
                {projects.length} Projects Available
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-heading">
                Project Name
              </span>
              <p className="mt-1 text-base font-bold text-slate-900 font-heading">
                {loading ? "Loading..." : activeProject?.name || "AuraTrace Demo"}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-heading">
                  Project API Key
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

              <div className="mt-1.5 flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-slate-200 bg-[#f8fafc] p-2">
                <div className="flex items-center gap-2 flex-1 min-w-0 px-2">
                  <Key className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="font-mono text-xs font-bold text-slate-800 truncate">
                    {displayKey}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={copyApiKey}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 hover:border-slate-300 transition shadow-xs font-heading cursor-pointer shrink-0"
                >
                  {copiedKey ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-500" />
                      <span>Copy API Key</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Install AuraTrace */}
        <div className="panel space-y-4">
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
                <code>pip install auratrace</code>
                <button
                  type="button"
                  onClick={() => copyText("pip install auratrace", "python-install")}
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

        {/* Section 3: Initialize SDK */}
        <div className="panel p-6 bg-white border-slate-100 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading border-b border-slate-100 pb-3">
            Initialize SDK
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Node.js code block */}
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

              <div className="rounded-xl bg-slate-950 border border-slate-900 p-4 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto">
                <pre>
                  <code>
                    <span className="text-purple-400">const</span>{" "}
                    <span className="text-amber-300">AuraTrace</span> ={" "}
                    <span className="text-blue-400">require</span>(
                    <span className="text-emerald-300">&quot;@auratrace/node&quot;</span>
                    );
                    {"\n\n"}
                    <span className="text-amber-300">AuraTrace</span>.
                    <span className="text-blue-400">init</span>(&#123;
                    {"\n"}
                    &nbsp;&nbsp;apiKey:{" "}
                    <span className="text-sky-300">process</span>.
                    <span className="text-sky-300">env</span>.
                    <span className="text-emerald-300">AURATRACE_API_KEY</span>
                    {"\n"}
                    &#125;);
                  </code>
                </pre>
              </div>
            </div>

            {/* Python code block */}
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

              <div className="rounded-xl bg-slate-950 border border-slate-900 p-4 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto">
                <pre>
                  <code>
                    <span className="text-purple-400">import</span>{" "}
                    <span className="text-purple-400">os</span>
                    {"\n"}
                    <span className="text-purple-400">import</span>{" "}
                    <span className="text-blue-300">auratrace</span>
                    {"\n\n"}
                    <span className="text-blue-300">auratrace</span>.
                    <span className="text-blue-400">init</span>(
                    {"\n"}
                    &nbsp;&nbsp;&nbsp;&nbsp;api_key=
                    <span className="text-purple-400">os</span>.
                    <span className="text-blue-300">getenv</span>(
                    <span className="text-emerald-300">&quot;AURATRACE_API_KEY&quot;</span>
                    )
                    {"\n"}
                    )
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: You're ready */}
        <div className="panel p-6 bg-gradient-to-r from-slate-900 to-slate-950 border-slate-800 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
              <h3 className="text-base font-bold font-heading text-white">
                You&apos;re ready
              </h3>
            </div>
            <p className="text-xs text-slate-300 font-sans max-w-lg leading-relaxed">
              AuraTrace automatically detects your application, runtime, version, crashes, and telemetry.
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

