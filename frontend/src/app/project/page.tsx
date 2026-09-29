"use client";

import React from "react";
import Link from "next/link";
import {
  FolderGit2,
  CheckCircle2,
  Users,
  Server,
  Layers,
  GitBranch,
  ShieldCheck,
  Code2,
  Terminal,
  ExternalLink,
  Cpu,
  Database,
  ArrowRight,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { PublicFooter } from "@/components/layout/PublicFooter";

export default function ProjectPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 font-sans selection:bg-red-500/20 selection:text-red-900">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* ======================================================== */}
        {/* 1. PROJECT HERO / HEADER */}
        {/* ======================================================== */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 text-center shadow-xs">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3.5 py-1 text-xs font-bold text-red-700 font-heading mb-4">
            <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
            Project Specification &amp; Deliverables
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 font-heading tracking-tight">
            AuraTrace SDK
          </h1>

          <p className="text-base sm:text-lg font-bold text-red-600 font-heading mt-2">
            AI-powered autonomous debugging SDK
          </p>

          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto mt-3 leading-relaxed font-sans">
            Automatically detects, diagnoses, and repairs application failures in distributed microservices and cloud workloads.
          </p>
        </div>

        {/* ======================================================== */}
        {/* 2. SDK USAGE STATISTICS */}
        {/* ======================================================== */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-heading block">
                Adoption Metrics
              </span>
              <h2 className="text-lg font-bold text-slate-900 font-heading">
                SDK Usage
              </h2>
            </div>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-bold text-emerald-700 font-heading">
              Active Telemetry
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {/* 1,248 Developers */}
            <div className="rounded-2xl bg-slate-50/80 p-5 border border-slate-100">
              <div className="text-3xl font-black text-slate-900 font-heading">
                1,248
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-1">
                Developers
              </div>
            </div>

            {/* 86 Projects */}
            <div className="rounded-2xl bg-slate-50/80 p-5 border border-slate-100">
              <div className="text-3xl font-black text-slate-900 font-heading">
                86
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-1">
                Projects
              </div>
            </div>

            {/* 3,421 Applications */}
            <div className="rounded-2xl bg-slate-50/80 p-5 border border-slate-100">
              <div className="text-3xl font-black text-slate-900 font-heading">
                3,421
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-1">
                Applications
              </div>
            </div>

            {/* 2 SDK Versions */}
            <div className="rounded-2xl bg-slate-50/80 p-5 border border-slate-100">
              <div className="text-3xl font-black text-slate-900 font-heading">
                2
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-1">
                SDK Versions
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. SUPPORTED SDKS */}
        {/* ======================================================== */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-heading block">
                Runtime Implementations
              </span>
              <h2 className="text-lg font-bold text-slate-900 font-heading">
                Supported SDKs
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Python SDK */}
            <div className="rounded-2xl border border-slate-100 bg-[#fbfcfe] p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-800 text-xs font-bold font-mono">
                    Py
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm font-heading">
                    Python
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-heading">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Available
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Python 3.9+ native instrumentation with automatic <code>sys.excepthook</code> crash capture and background HTTP transport.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100/80 flex items-center justify-between text-xs">
                <code className="text-[11px] text-slate-700 font-mono">
                  pip install auratrace
                </code>
                <Link href="/docs#python" className="text-red-600 font-bold hover:underline">
                  Quickstart →
                </Link>
              </div>
            </div>

            {/* Node.js SDK */}
            <div className="rounded-2xl border border-slate-100 bg-[#fbfcfe] p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold font-mono">
                    JS
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm font-heading">
                    Node.js
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-heading">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Available
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Node.js 18+ TypeScript client with <code>uncaughtException</code> and <code>unhandledRejection</code> interception.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100/80 flex items-center justify-between text-xs">
                <code className="text-[11px] text-slate-700 font-mono">
                  npm i @auratrace/node
                </code>
                <Link href="/docs#nodejs" className="text-red-600 font-bold hover:underline">
                  Quickstart →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 4. PROJECT INFORMATION MATRIX */}
        {/* ======================================================== */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-heading block">
                Metadata &amp; Release
              </span>
              <h2 className="text-lg font-bold text-slate-900 font-heading">
                Project Information
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            {/* Version */}
            <div className="rounded-2xl bg-slate-50/80 p-4 border border-slate-100">
              <span className="text-[11px] font-bold uppercase text-slate-400 font-heading block">
                Version
              </span>
              <div className="text-xl font-black text-slate-900 font-heading mt-1">
                1.0.0
              </div>
            </div>

            {/* License */}
            <div className="rounded-2xl bg-slate-50/80 p-4 border border-slate-100">
              <span className="text-[11px] font-bold uppercase text-slate-400 font-heading block">
                License
              </span>
              <div className="text-xl font-black text-slate-900 font-heading mt-1">
                MIT
              </div>
            </div>

            {/* Status */}
            <div className="rounded-2xl bg-slate-50/80 p-4 border border-slate-100">
              <span className="text-[11px] font-bold uppercase text-slate-400 font-heading block">
                Status
              </span>
              <div className="text-xl font-black text-emerald-600 font-heading mt-1">
                Active
              </div>
            </div>
          </div>

          {/* Detailed Technical Specs Table */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-heading mb-4">
              Core Subsystem Specifications
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-heading">
                    <th className="pb-2 font-bold">Subsystem</th>
                    <th className="pb-2 font-bold">Technology</th>
                    <th className="pb-2 font-bold">Functionality</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="py-2.5 font-bold text-slate-900">SDK Clients</td>
                    <td className="py-2.5 font-mono text-[11px]">Python / TypeScript</td>
                    <td className="py-2.5">Non-blocking crash hooks &amp; telemetry buffering</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-slate-900">Ingestion Gateway</td>
                    <td className="py-2.5 font-mono text-[11px]">FastAPI + Redis Streams</td>
                    <td className="py-2.5">At-least-once ingestion &amp; project-scoped auth</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-slate-900">Anomaly Engine</td>
                    <td className="py-2.5 font-mono text-[11px]">Isolation Forest (scikit-learn)</td>
                    <td className="py-2.5">Unsupervised window telemetry anomaly classification</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-slate-900">Historical RAG Store</td>
                    <td className="py-2.5 font-mono text-[11px]">PostgreSQL + pgvector</td>
                    <td className="py-2.5">Cosine similarity match on verified fix embeddings</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-slate-900">AI Doctor</td>
                    <td className="py-2.5 font-mono text-[11px]">Gemini 1.5 Pro / Flash</td>
                    <td className="py-2.5">Root-cause diagnosis grounded on stack traces &amp; fixes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* CTA Footer Card */}
        <div className="rounded-3xl border border-red-100 bg-linear-to-r from-red-50 to-white p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-heading">
              Ready to integrate AuraTrace into your application?
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Read the installation guide and explore configuration options in the documentation.
            </p>
          </div>
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white px-5 py-2.5 text-xs font-bold font-heading shadow-sm transition shrink-0"
          >
            <Terminal className="h-4 w-4" />
            <span>Read Documentation</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
