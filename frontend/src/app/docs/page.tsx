"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Terminal,
  Copy,
  Check,
  Code2,
  FileCode,
  ShieldCheck,
  Layers,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Info,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { PublicFooter } from "@/components/layout/PublicFooter";

export default function DocumentationPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 font-sans selection:bg-red-500/20 selection:text-red-900">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* Header */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 shadow-xs">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700 font-heading mb-3">
            <BookOpen className="h-3.5 w-3.5" />
            Developer Documentation
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 font-heading tracking-tight">
            AuraTrace SDK Integration Guide
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed max-w-2xl">
            Complete setup instructions, zero-boilerplate runtime hooks, and configuration reference for instrumenting Python and Node.js applications.
          </p>
        </div>

        {/* ======================================================== */}
        {/* 1. PYTHON SDK GUIDE */}
        {/* ======================================================== */}
        <section id="python" className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-800 text-xs font-bold font-mono">
                Py
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-heading">
                  Python SDK Guide
                </h2>
                <p className="text-xs text-slate-500">Supports Python 3.9, 3.10, 3.11, 3.12, 3.14</p>
              </div>
            </div>
            <span className="text-[11px] font-mono bg-slate-100 px-2.5 py-1 rounded-md text-slate-700">
              v1.0.0
            </span>
          </div>

          {/* Installation */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-heading">
              1. Installation
            </h3>
            <div className="flex items-center justify-between rounded-xl bg-slate-950 p-3 text-xs font-mono text-slate-100">
              <span>pip install auratrace</span>
              <button
                type="button"
                onClick={() => copyToClipboard("pip install auratrace", "py-install")}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
              >
                {copied === "py-install" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Quickstart Code */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-heading">
              2. Basic Initialization
            </h3>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs font-mono text-slate-300 overflow-x-auto">
              <pre>{`from auratrace import AuraClient

client = AuraClient(
    project_id="00000000-0000-0000-0000-000000000001",
    api_key="YOUR_PROJECT_API_KEY",
    service_name="payment-service",
    endpoint="http://localhost:8000"
)

# Starts automatic telemetry worker and registers sys.excepthook
client.start()`}</pre>
            </div>
          </div>

          {/* FastAPI Middleware Example */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-heading">
              3. FastAPI / ASGI Middleware
            </h3>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs font-mono text-slate-300 overflow-x-auto">
              <pre>{`from fastapi import FastAPI
from auratrace.hooks import instrument_fastapi

app = FastAPI()
client = AuraClient(service_name="order-api")
instrument_fastapi(app, client)`}</pre>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 2. NODE.JS SDK GUIDE */}
        {/* ======================================================== */}
        <section id="nodejs" className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold font-mono">
                JS
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-heading">
                  Node.js SDK Guide
                </h2>
                <p className="text-xs text-slate-500">Supports Node.js 18.x, 20.x, 22.x LTS</p>
              </div>
            </div>
            <span className="text-[11px] font-mono bg-slate-100 px-2.5 py-1 rounded-md text-slate-700">
              v2.0.0
            </span>
          </div>

          {/* Installation */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-heading">
              1. Installation
            </h3>
            <div className="flex items-center justify-between rounded-xl bg-slate-950 p-3 text-xs font-mono text-slate-100">
              <span>npm install @auratrace/node</span>
              <button
                type="button"
                onClick={() => copyToClipboard("npm install @auratrace/node", "node-install")}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
              >
                {copied === "node-install" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Quickstart Code */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-heading">
              2. Basic Initialization
            </h3>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs font-mono text-slate-300 overflow-x-auto">
              <pre>{`import { initAuraTrace } from "@auratrace/node";

const aura = initAuraTrace({
  projectId: "00000000-0000-0000-0000-000000000001",
  apiKey: "YOUR_PROJECT_API_KEY",
  serviceName: "auth-service",
  endpoint: "http://localhost:8000"
});

// Automatic process uncaughtException and unhandledRejection interceptors active!`}</pre>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 3. CONFIGURATION PARAMETERS */}
        {/* ======================================================== */}
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-heading block">
              Reference
            </span>
            <h2 className="text-lg font-bold text-slate-900 font-heading">
              SDK Configuration Parameters
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-heading">
                  <th className="pb-2 font-bold">Parameter</th>
                  <th className="pb-2 font-bold">Type</th>
                  <th className="pb-2 font-bold">Default</th>
                  <th className="pb-2 font-bold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                <tr>
                  <td className="py-2.5 font-mono text-[11px] font-bold text-red-700">project_id / projectId</td>
                  <td className="py-2.5 font-mono text-[11px]">string</td>
                  <td className="py-2.5 font-mono text-[11px] text-slate-400">required</td>
                  <td className="py-2.5">UUID of the target AuraTrace project partition</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-mono text-[11px] font-bold text-red-700">api_key / apiKey</td>
                  <td className="py-2.5 font-mono text-[11px]">string</td>
                  <td className="py-2.5 font-mono text-[11px] text-slate-400">required</td>
                  <td className="py-2.5">16-character alphanumeric authorization key</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-mono text-[11px] font-bold text-slate-900">service_name / serviceName</td>
                  <td className="py-2.5 font-mono text-[11px]">string</td>
                  <td className="py-2.5 font-mono text-[11px]">"default-service"</td>
                  <td className="py-2.5">Identifier for the microservice application</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-mono text-[11px] font-bold text-slate-900">endpoint</td>
                  <td className="py-2.5 font-mono text-[11px]">string</td>
                  <td className="py-2.5 font-mono text-[11px]">"http://localhost:8000"</td>
                  <td className="py-2.5">URL of the AuraTrace ingestion gateway</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-mono text-[11px] font-bold text-slate-900">environment</td>
                  <td className="py-2.5 font-mono text-[11px]">string</td>
                  <td className="py-2.5 font-mono text-[11px]">"production"</td>
                  <td className="py-2.5">Runtime environment tag (e.g. dev, staging, prod)</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-mono text-[11px] font-bold text-slate-900">sample_rate / sampleRate</td>
                  <td className="py-2.5 font-mono text-[11px]">number</td>
                  <td className="py-2.5 font-mono text-[11px]">1.0</td>
                  <td className="py-2.5">Telemetry metric sampling fraction (0.0 to 1.0)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 4. DESIGN PRINCIPLES & GUARANTEES */}
        {/* ======================================================== */}
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-heading block">
              Performance &amp; Safety
            </span>
            <h2 className="text-lg font-bold text-slate-900 font-heading">
              Runtime Guarantees
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
              <h4 className="font-bold text-slate-900 font-heading">Sub-Millisecond Overhead</h4>
              <p>Telemetry events are queued in an in-memory buffer and flushed asynchronously via worker threads. Application requests never block waiting on telemetry I/O.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
              <h4 className="font-bold text-slate-900 font-heading">Exit-Safe Crash Interception</h4>
              <p>When an unhandled exception occurs, the SDK flushes the final crash payload before passing the exception to the runtime's default exit handler.</p>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
