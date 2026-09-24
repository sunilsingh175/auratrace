"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  EyeOff,
  Server,
  FileText,
  Clock,
  Globe2,
  Mail,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Database,
  Cpu,
} from "lucide-react";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthFooter } from "@/components/auth/AuthFooter";

export default function PrivacyPolicyPage() {
  const lastUpdated = "September 2026";

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
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Platform Privacy Statement</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-heading">
            Privacy Policy
          </h1>

          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl font-sans">
            Automatic Backend Detection collects application telemetry and crash information to detect failures, identify potential causes, retrieve relevant historical fixes, and generate diagnostic recommendations.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-6 pt-6 border-t border-slate-100 text-xs text-slate-500 font-sans">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Effective: {lastUpdated}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700 font-medium">Project-Isolated Telemetry</span>
            </div>
          </div>
        </div>

        {/* Policy Content Sections */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.04)] space-y-10 text-sm leading-relaxed text-slate-700 font-sans">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5 font-heading">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold font-heading">1</span>
              <span>Data Collected When the SDK is Installed</span>
            </h2>
            <p>
              When an application integrates the Automatic Backend Detection Node.js or Python SDK, our platform ingests diagnostic and operational telemetry necessary for automated incident triage:
            </p>

            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-[#f8fafc] border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 font-heading">
                  <Server className="w-3.5 h-3.5 text-blue-600" />
                  <span>Project & Application Information</span>
                </div>
                <p className="text-xs text-slate-600">
                  Service name identifier, registered project ID, SDK client version, and runtime platform (Node.js/Python).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#f8fafc] border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 font-heading">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Error & Crash Information</span>
                </div>
                <p className="text-xs text-slate-600">
                  Exception class names, error codes, failure messages, and HTTP status codes.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#f8fafc] border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 font-heading">
                  <FileText className="w-3.5 h-3.5 text-purple-600" />
                  <span>Stack Traces</span>
                </div>
                <p className="text-xs text-slate-600">
                  Call frame execution traces, source file paths, and execution line markers.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#f8fafc] border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 font-heading">
                  <Cpu className="w-3.5 h-3.5 text-amber-600" />
                  <span>Runtime & Environment Information</span>
                </div>
                <p className="text-xs text-slate-600">
                  Process memory metrics, CPU telemetry, OS platform, and rolling request counts.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#f8fafc] border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 font-heading">
                  <Database className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Performance & Telemetry Data</span>
                </div>
                <p className="text-xs text-slate-600">
                  Latency percentiles, error rates, throughput velocity, and 5-minute rolling window aggregates.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#f8fafc] border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 font-heading">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
                  <span>Account & Diagnostic Information</span>
                </div>
                <p className="text-xs text-slate-600">
                  User email, role entitlements, AI root-cause analysis, and vector similarity match records.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5 font-heading">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold font-heading">2</span>
              <span>Why Data is Collected</span>
            </h2>
            <div className="p-4 rounded-2xl bg-red-50/50 border border-red-100 text-slate-800 text-xs sm:text-sm leading-relaxed font-sans">
              <strong>Purpose:</strong> Automatic Backend Detection collects application telemetry and crash information to detect failures, identify potential causes, retrieve relevant historical fixes, and generate diagnostic recommendations.
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5 font-heading">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold font-heading">3</span>
              <span>Sensitive Secrets & Log Sanitization Policy</span>
            </h2>
            <p>
              <strong>Automatic Backend Detection does not intentionally collect passwords, authentication tokens, API keys, database connection strings, or other secrets from application logs.</strong>
            </p>
            <p>
              While client SDKs filter standard authorization headers, developers are responsible for ensuring that proprietary application logs and payload attachments are sanitized before transmission where appropriate.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5 font-heading">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold font-heading">4</span>
              <span>Data Isolation & Retention</span>
            </h2>
            <p>
              All telemetry, anomalous events, and diagnostic reports are isolated strictly by Project API Key. Data is stored in your dedicated PostgreSQL database and Redis streams, and can be purged at any time from the Admin Console.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5 font-heading">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold font-heading">5</span>
              <span>Questions & Inquiries</span>
            </h2>
            <p>
              If you have any questions regarding this Privacy Policy or data handling in Automatic Backend Detection, please reach out via our contact page:
            </p>
            <div className="pt-2">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#dc2626] text-white hover:bg-[#b91c1c] text-xs font-semibold font-heading transition shadow-xs"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Contact Project Team</span>
              </Link>
            </div>
          </section>
        </div>
      </main>

      <AuthFooter />
    </div>
  );
}
