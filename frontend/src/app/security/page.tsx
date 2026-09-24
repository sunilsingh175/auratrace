"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Shield,
  Cpu,
  Lock,
  KeyRound,
  Server,
  Fingerprint,
  CheckCircle2,
  ArrowLeft,
  Mail,
  Zap,
  Layers,
  Database,
  Terminal,
  ArrowDown,
} from "lucide-react";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthFooter } from "@/components/auth/AuthFooter";

export default function SecurityArchitecturePage() {
  const pipelineSteps = [
    { title: "Application", desc: "User application running Node.js or Python backend services" },
    { title: "AutoTrace SDK", desc: "Captures unhandled exceptions, runtime telemetry, and rolling metric windows" },
    { title: "API Authentication", desc: "Validates project API keys and enforces project-level tenant isolation" },
    { title: "FastAPI Ingestion Service", desc: "High-throughput asynchronous telemetry receiver and schema validator" },
    { title: "Redis Stream Buffer", desc: "In-memory operational queue decoupling telemetry ingestion from ML evaluation" },
    { title: "ML Anomaly Detection", desc: "Unsupervised Isolation Forest model detecting system & latency anomalies" },
    { title: "PostgreSQL + pgvector", desc: "Persistent incident store and high-dimensional embeddings for similarity search" },
    { title: "RAG / AI Diagnosis", desc: "Retrieval-augmented root cause analysis and contextual code fix synthesis" },
  ];

  const securityFeatures = [
    {
      title: "API-Key Authentication",
      desc: "Every telemetry payload requires an authorized workspace API key before ingestion.",
    },
    {
      title: "Project-Level Isolation",
      desc: "Telemetry, services, and crash incidents are strictly partitioned per project API key.",
    },
    {
      title: "Role-Based Access Control (RBAC)",
      desc: "Dashboard access distinguishes Developer permissions from Administrator controls.",
    },
    {
      title: "Stack-Trace Sanitization",
      desc: "Client SDKs sanitize authorization headers and sensitive tokens prior to transport.",
    },
    {
      title: "Server-Side API Key Hashing",
      desc: "API keys and password credentials are securely hashed and authenticated server-side.",
    },
    {
      title: "Internal Microservice Network",
      desc: "PostgreSQL, Redis, and ML workers communicate over an isolated internal Docker bridge network.",
    },
    {
      title: "Developer vs Admin Separation",
      desc: "Administrative operations (user suspension, project purging) require verified Admin status.",
    },
    {
      title: "No Automatic Source Code Modification",
      desc: "AutoTrace operates in read-only diagnostic mode; source code changes require explicit developer action.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-900 flex flex-col justify-between selection:bg-red-500/20 selection:text-red-900 font-sans">
      <AuthHeader />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 md:py-12">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors font-heading"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </Link>
        </div>

        {/* Page Hero */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.04)] mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-100 text-xs font-semibold text-[#dc2626] mb-4 font-heading">
            <Shield className="w-3.5 h-3.5" />
            <span>Technical Security Overview</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-heading">
            Security Architecture
          </h1>

          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl font-sans">
            AutoTrace is designed with multi-tier service isolation, API authentication, and read-only telemetry diagnostics to ensure secure observability for backend applications.
          </p>
        </div>

        {/* Implemented System Architecture Pipeline */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.04)] mb-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
              Implemented Telemetry & Diagnostic Pipeline
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              End-to-end data flow from client application to AI diagnosis
            </p>
          </div>

          <div className="space-y-2">
            {pipelineSteps.map((step, idx) => (
              <React.Fragment key={idx}>
                <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-800 text-xs font-bold font-mono">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm font-heading">
                      {step.title}
                    </span>
                  </div>
                  <span className="text-xs text-slate-600 font-sans sm:text-right">
                    {step.desc}
                  </span>
                </div>

                {idx < pipelineSteps.length - 1 && (
                  <div className="flex justify-center py-0.5">
                    <ArrowDown className="h-4 w-4 text-slate-300" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Implemented Security Measures Grid */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.04)] mb-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
              Implemented Security Measures
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Technical protections actively enforcing safety across the platform
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {securityFeatures.map((feat, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-[#f8fafc] border border-slate-100 space-y-1.5"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 font-heading">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{feat.title}</span>
                </div>
                <p className="text-xs text-slate-600 font-sans pl-6 leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Security Questions Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div>
            <h3 className="text-base sm:text-lg font-bold font-heading">
              Have a security inquiry or vulnerability report?
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-lg font-sans">
              For security-related questions or responsible disclosure regarding the AutoTrace project architecture, please contact our team.
            </p>
          </div>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-semibold font-heading transition shrink-0 shadow-sm"
          >
            <Mail className="w-4 h-4" />
            <span>Contact Security Team</span>
          </Link>
        </div>
      </main>

      <AuthFooter />
    </div>
  );
}
