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
  Code2,
  Sparkles,
  ArrowRight,
  Terminal,
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

  // Copied state
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedNodeCode, setCopiedNodeCode] = useState(false);
  const [copiedPythonCode, setCopiedPythonCode] = useState(false);

  // Active quickstart tab
  const [activeTab, setActiveTab] = useState<"node" | "python">("node");

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
  const apiKey = activeProject?.api_key || "at_live_master_key_12345";

  const copyApiKey = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {
      // Fallback
    }
  };

  const nodeSnippet = `// 1. Install SDK: npm install @auratrace/node
import { AuraTrace } from '@auratrace/node';

// 2. Initialize AuraTrace (automatically captures crashes & unhandled exceptions)
AuraTrace.init({
  apiKey: "${apiKey}"
});

// 3. Attach Express / HTTP middleware
app.use(AuraTrace.expressMiddleware());`;

  const pythonSnippet = `# 1. Install SDK: pip install auratrace
import auratrace

# 2. Initialize AuraTrace (automatically captures crashes & unhandled exceptions)
auratrace.init(
    api_key="${apiKey}"
)`;

  const copySnippet = async (type: "node" | "python") => {
    const text = type === "node" ? nodeSnippet : pythonSnippet;
    try {
      await navigator.clipboard.writeText(text);
      if (type === "node") {
        setCopiedNodeCode(true);
        setTimeout(() => setCopiedNodeCode(false), 2000);
      } else {
        setCopiedPythonCode(true);
        setTimeout(() => setCopiedPythonCode(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  return (
    <AppShell hideHeaderTitle>
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <FolderKanban className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
              Quick Setup
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 font-heading sm:text-3xl">
            Projects &amp; Setup
          </h1>
          <p className="mt-1 text-xs text-slate-500 font-sans">
            Create an AuraTrace project, copy your Ingestion Key, and add the SDK to your application.
          </p>
        </div>

        {/* Feedback / Error Alerts */}
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

        {/* Step 1: Create / Switch Project */}
        <div className="panel p-6 bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
          <h2 className="text-sm font-bold text-slate-900 font-heading uppercase tracking-wider">
            1. Create your AuraTrace Project
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5 mb-4">
            A project provides a dedicated ingestion key for all crashes across your app.
          </p>

          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="e.g. Payment API or My Web App"
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

        {/* Step 2: Active Project & API Key */}
        {loading ? (
          <div className="panel p-8 text-center text-xs text-slate-400 font-mono">
            Loading project details...
          </div>
        ) : activeProject ? (
          <div className="space-y-6">
            <div className="panel p-6 bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-heading">
                    Active Project
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 font-heading mt-0.5">
                    {activeProject.name}
                  </h3>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                  <span>ID: {activeProject.id.substring(0, 8)}...</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-700 font-heading">
                  Project Ingestion API Key
                </span>
                <p className="text-[11px] text-slate-500 font-sans mt-0.5 mb-2">
                  Use this key in your application to authenticate the AuraTrace SDK.
                </p>

                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-[#f8fafc] p-2.5">
                  <Key className="h-4 w-4 text-slate-400 shrink-0 ml-1.5" />
                  <span className="flex-1 font-mono text-xs font-bold text-slate-800 truncate">
                    {apiKey}
                  </span>
                  <button
                    type="button"
                    onClick={copyApiKey}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 hover:border-slate-300 transition shadow-xs font-heading cursor-pointer shrink-0"
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

            {/* Step 3: Install SDK */}
            <div className="panel p-6 bg-slate-950 border-slate-900 text-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <Code2 className="h-5 w-5 text-red-500" />
                  <h3 className="text-sm font-bold font-heading text-white">
                    2. Install AuraTrace in your Application
                  </h3>
                </div>

                {/* Runtime Toggle */}
                <div className="flex items-center rounded-lg bg-slate-900 p-1 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveTab("node")}
                    className={`rounded-md px-3 py-1 text-xs font-bold transition font-heading cursor-pointer ${
                      activeTab === "node"
                        ? "bg-[#dc2626] text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Node.js
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("python")}
                    className={`rounded-md px-3 py-1 text-xs font-bold transition font-heading cursor-pointer ${
                      activeTab === "python"
                        ? "bg-[#dc2626] text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Python
                  </button>
                </div>
              </div>

              {activeTab === "node" ? (
                <div className="space-y-4">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-heading">
                      1. Install Package
                    </span>
                    <div className="mt-1.5 flex items-center justify-between rounded-xl bg-slate-900 border border-slate-800 px-4 py-2.5 font-mono text-xs text-slate-200">
                      <code>npm install @auratrace/node</code>
                      <button
                        type="button"
                        onClick={() => copySnippet("node")}
                        className="text-slate-400 hover:text-white transition"
                        title="Copy setup snippet"
                      >
                        {copiedNodeCode ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-heading">
                      2. Add to your app entry (e.g. server.js or index.ts)
                    </span>
                    <div className="mt-1.5 relative rounded-xl bg-slate-900 border border-slate-800 p-4 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto">
                      <pre>
                        <code>
                          <span className="text-purple-400">import</span> &#123; <span className="text-amber-300">AuraTrace</span> &#125; <span className="text-purple-400">from</span> <span className="text-emerald-300">&apos;@auratrace/node&apos;</span>;
                          {"\n\n"}
                          <span className="text-slate-500">// Initialize with your project API key</span>
                          {"\n"}
                          <span className="text-amber-300">AuraTrace</span>.<span className="text-blue-400">init</span>(&#123;
                          {"\n"}
                          &nbsp;&nbsp;apiKey: <span className="text-emerald-300">&quot;{apiKey}&quot;</span>
                          {"\n"}
                          &#125;);
                          {"\n\n"}
                          <span className="text-slate-500">// Automatic Express error capture</span>
                          {"\n"}
                          app.<span className="text-blue-400">use</span>(<span className="text-amber-300">AuraTrace</span>.<span className="text-blue-400">expressMiddleware</span>());
                        </code>
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-heading">
                      1. Install Package
                    </span>
                    <div className="mt-1.5 flex items-center justify-between rounded-xl bg-slate-900 border border-slate-800 px-4 py-2.5 font-mono text-xs text-slate-200">
                      <code>pip install auratrace</code>
                      <button
                        type="button"
                        onClick={() => copySnippet("python")}
                        className="text-slate-400 hover:text-white transition"
                        title="Copy setup snippet"
                      >
                        {copiedPythonCode ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-heading">
                      2. Add to your app entry (e.g. main.py or app.py)
                    </span>
                    <div className="mt-1.5 relative rounded-xl bg-slate-900 border border-slate-800 p-4 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto">
                      <pre>
                        <code>
                          <span className="text-purple-400">import</span> <span className="text-blue-300">auratrace</span>
                          {"\n\n"}
                          <span className="text-slate-500"># Initialize with your project API key</span>
                          {"\n"}
                          <span className="text-blue-300">auratrace</span>.<span className="text-blue-400">init</span>(
                          {"\n"}
                          &nbsp;&nbsp;&nbsp;&nbsp;api_key=<span className="text-emerald-300">&quot;{apiKey}&quot;</span>
                          {"\n"}
                          )
                        </code>
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-sans">
                  Once your app runs, crashes will automatically stream to AuraTrace.
                </span>
                <Link
                  href="/incidents"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 transition font-heading"
                >
                  <span>Go to Crashes Feed</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
