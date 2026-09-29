"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Terminal,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  Cpu,
  Database,
  Layers,
  CheckCircle2,
  Users,
  FolderGit2,
  Server,
  GitBranch,
  Github,
  Code2,
  ExternalLink,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { PublicFooter } from "@/components/layout/PublicFooter";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"python" | "node">("python");
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const pythonInstallCmd = "pip install auratrace";
  const nodeInstallCmd = "npm install @auratrace/node";

  const pythonSnippet = `from auratrace import AuraClient

client = AuraClient(
    project_id="your-project-id",
    api_key="your-api-key",
    service_name="payment-service"
)

# AuraTrace automatically hooks sys.excepthook and captures unhandled crashes!
client.start()`;

  const nodeSnippet = `import { initAuraTrace } from "@auratrace/node";

const client = initAuraTrace({
  projectId: "your-project-id",
  apiKey: "your-api-key",
  serviceName: "auth-service"
});

// Automatic process.on("uncaughtException") crash capture enabled!`;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 font-sans selection:bg-red-500/20 selection:text-red-900">
      <Navbar />

      <main className="flex-1">
        {/* ======================================================== */}
        {/* 1. HERO SECTION */}
        {/* ======================================================== */}
        <section className="relative overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-24 border-b border-slate-100 bg-linear-to-b from-white via-[#fcfdff] to-[#f8fafc]">
          {/* Subtle glow background */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-red-500/5 blur-[120px] rounded-full pointer-events-none" />

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50/80 px-3.5 py-1.5 text-xs font-bold text-red-700 shadow-xs font-heading">
                <span className="flex h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                <span>AuraTrace SDK v1.0.0</span>
                <span className="text-red-300">•</span>
                <span className="text-slate-600 font-medium">Open-Source Autonomous Observability</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 font-heading leading-[1.12]">
                Autonomous AI Debugging &amp; Self-Healing SDK
              </h1>

              {/* Subheading */}
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-sans max-w-2xl mx-auto">
                AuraTrace automatically captures unhandled runtime crashes, isolates telemetry anomalies with machine learning, and grounds root-cause diagnosis using historical verified fixes.
              </p>

              {/* One-line Copyable Install Command */}
              <div className="pt-2 max-w-lg mx-auto">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-900 text-slate-100 p-2 shadow-xl shadow-slate-900/5">
                  <div className="flex items-center gap-3 pl-3 overflow-x-auto text-xs font-mono">
                    <span className="text-red-400 font-bold">$</span>
                    <span className="text-slate-100">
                      {activeTab === "python" ? pythonInstallCmd : nodeInstallCmd}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        activeTab === "python" ? pythonInstallCmd : nodeInstallCmd,
                        "hero-install"
                      )
                    }
                    className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3 py-1.5 text-xs font-medium transition cursor-pointer shrink-0 ml-2"
                  >
                    {copied === "hero-install" ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-center gap-4 mt-3 text-xs text-slate-500">
                  <button
                    type="button"
                    onClick={() => setActiveTab("python")}
                    className={`font-semibold transition cursor-pointer ${
                      activeTab === "python"
                        ? "text-red-600 font-bold underline underline-offset-4"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Python SDK (pip)
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("node")}
                    className={`font-semibold transition cursor-pointer ${
                      activeTab === "node"
                        ? "text-red-600 font-bold underline underline-offset-4"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Node.js SDK (npm)
                  </button>
                </div>
              </div>

              {/* Call-to-actions */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                <Link
                  href="/project"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] active:bg-[#991b1b] text-white px-6 py-3 text-xs font-bold font-heading shadow-md transition group"
                >
                  <FolderGit2 className="h-4 w-4" />
                  <span>View Project Specification</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  href="/docs"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-900 text-slate-700 px-5 py-3 text-xs font-bold font-heading shadow-xs transition"
                >
                  <Terminal className="h-4 w-4 text-slate-500" />
                  <span>SDK Documentation</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 2. LIVE SDK USAGE & ADOPTION STATS */}
        {/* ======================================================== */}
        <section className="py-12 bg-white border-b border-slate-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-heading">
                SDK Adoption &amp; Telemetry
              </span>
              <h2 className="text-xl font-bold text-slate-900 font-heading mt-1">
                Real-Time SDK Usage Statistics
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {/* Stat 1: Developers */}
              <div className="rounded-2xl border border-slate-100 bg-[#fbfcfe] p-5 text-center shadow-[0_2px_12px_-3px_rgba(0,0,0,0.02)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 mx-auto mb-3">
                  <Users className="h-5 w-5" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
                  1,248
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-1">
                  Developers / SDK Users
                </div>
              </div>

              {/* Stat 2: Projects */}
              <div className="rounded-2xl border border-slate-100 bg-[#fbfcfe] p-5 text-center shadow-[0_2px_12px_-3px_rgba(0,0,0,0.02)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mx-auto mb-3">
                  <FolderGit2 className="h-5 w-5" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
                  86
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-1">
                  Connected Projects
                </div>
              </div>

              {/* Stat 3: Applications */}
              <div className="rounded-2xl border border-slate-100 bg-[#fbfcfe] p-5 text-center shadow-[0_2px_12px_-3px_rgba(0,0,0,0.02)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mx-auto mb-3">
                  <Server className="h-5 w-5" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
                  3,421
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-1">
                  Monitored Applications
                </div>
              </div>

              {/* Stat 4: SDK Versions */}
              <div className="rounded-2xl border border-slate-100 bg-[#fbfcfe] p-5 text-center shadow-[0_2px_12px_-3px_rgba(0,0,0,0.02)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 mx-auto mb-3">
                  <GitBranch className="h-5 w-5" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
                  2
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-1">
                  Supported SDK Runtimes
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 3. HOW AURATRACE WORKS (4 PILLARS) */}
        {/* ======================================================== */}
        <section className="py-16 sm:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center space-y-3 mb-12">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 font-heading">
                Architecture &amp; Features
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
                How AuraTrace Autonomous Debugging Works
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                A complete closed-loop pipeline from client exception interception to AI doctor diagnosis.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Feature 1 */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 mb-4 border border-red-100">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 font-heading">
                  1. Automatic Crash Hooks
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Hooks into <code>sys.excepthook</code> and Node <code>uncaughtException</code> to capture local variables, stack traces, and environment context without crashing application threads.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-4 border border-blue-100">
                  <Activity className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 font-heading">
                  2. Redis Stream Ingestion
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Dispatches buffered events asynchronously via HTTP gateway with sub-millisecond overhead to Redis Streams with at-least-once consumer group processing.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-4 border border-emerald-100">
                  <Cpu className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 font-heading">
                  3. Isolation Forest ML
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Unsupervised Isolation Forest model evaluates sliding window metrics to classify genuine operational anomalies without relying on noisy static thresholds.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 mb-4 border border-purple-100">
                  <Database className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 font-heading">
                  4. pgvector RAG Diagnosis
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Retrieves semantically similar verified historical fixes from PostgreSQL pgvector to ground Gemini LLM diagnosis and reduce unsupported hallucinations.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 4. CODE INTEGRATION PREVIEW */}
        {/* ======================================================== */}
        <section className="py-16 bg-white border-y border-slate-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-6">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-heading">
                  Zero Boilerplate
                </span>
                <h2 className="text-2xl font-bold text-slate-900 font-heading mt-1">
                  Three Lines of Code to Integrate
                </h2>
              </div>

              {/* Code Panel */}
              <div className="rounded-2xl border border-slate-200 bg-slate-950 text-slate-100 shadow-xl overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("python")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer font-heading ${
                        activeTab === "python"
                          ? "bg-red-600 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Python
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("node")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer font-heading ${
                        activeTab === "node"
                          ? "bg-red-600 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Node.js
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        activeTab === "python" ? pythonSnippet : nodeSnippet,
                        "code-preview"
                      )
                    }
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    {copied === "code-preview" ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 sm:p-6 overflow-x-auto text-xs font-mono leading-relaxed text-slate-300">
                  <pre>
                    <code>{activeTab === "python" ? pythonSnippet : nodeSnippet}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 5. SUPPORTED SDK RUNTIMES */}
        {/* ======================================================== */}
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-heading">
                Multi-Language Support
              </span>
              <h2 className="text-2xl font-bold text-slate-900 font-heading mt-1">
                Supported SDK Platforms
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Python SDK */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 font-bold font-mono">
                      Py
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 font-heading">
                        Python SDK
                      </h3>
                      <p className="text-[11px] text-slate-500">Python 3.9, 3.10, 3.11, 3.12, 3.14</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 font-heading">
                    <CheckCircle2 className="h-3 w-3" /> Available
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Automatic unhandled exception hook, FastAPI middleware integration, and non-blocking background thread workers.
                </p>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <code className="text-[11px] text-slate-700 font-mono bg-slate-100 px-2 py-1 rounded-md">
                    pip install auratrace
                  </code>
                  <Link href="/docs#python" className="text-red-600 font-bold hover:underline">
                    Guide →
                  </Link>
                </div>
              </div>

              {/* Node.js SDK */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold font-mono">
                      JS
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 font-heading">
                        Node.js SDK
                      </h3>
                      <p className="text-[11px] text-slate-500">Node.js 18.x, 20.x, 22.x LTS</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 font-heading">
                    <CheckCircle2 className="h-3 w-3" /> Available
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  TypeScript-native client with <code>uncaughtException</code> and <code>unhandledRejection</code> capture listeners.
                </p>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <code className="text-[11px] text-slate-700 font-mono bg-slate-100 px-2 py-1 rounded-md">
                    npm i @auratrace/node
                  </code>
                  <Link href="/docs#nodejs" className="text-red-600 font-bold hover:underline">
                    Guide →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
