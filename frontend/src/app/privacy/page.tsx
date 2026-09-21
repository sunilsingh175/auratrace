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
} from "lucide-react";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthFooter } from "@/components/auth/AuthFooter";

export default function PrivacyPolicyPage() {
  const lastUpdated = "September 2026";

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-900 flex flex-col justify-between selection:bg-red-500/20 selection:text-red-900">
      <AuthHeader />

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8 md:py-12">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Sign in</span>
          </Link>
        </div>

        {/* Page Hero */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.04)] mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-100 text-xs font-semibold text-[#b91c1c] mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Official Privacy Statement</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Privacy Policy
          </h1>

          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
            Automatic Backend Detection Inc. is engineered from the ground up with zero-knowledge telemetry principles, hardware enclave confidentiality, and rigorous global data compliance.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-6 pt-6 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Effective Date: {lastUpdated}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Applicable Jurisdictions: Global (GDPR, CCPA, SOC 2)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700 font-medium">Hardware Enclave Isolation Active</span>
            </div>
          </div>
        </div>

        {/* Policy Content Sections */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.04)] space-y-10 text-sm leading-relaxed text-slate-700">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold">1</span>
              <span>Overview & Zero-Data Exposure Commitment</span>
            </h2>
            <p>
              Automatic Backend Detection Inc. (“we”, “us”, or “our”) provides autonomous backend observability, Isolation Forest anomaly detection, and automated root-cause crash diagnostics. We adhere to a strict <strong>Zero-Data Exposure principle</strong>: we only process technical runtime telemetry strictly necessary to identify, alert, and diagnose system anomalies.
            </p>
            <p>
              We do not sell, rent, or monetize your data. Furthermore, our machine learning and AI inference diagnostics run within isolated runtime boundaries and are never used to train public or multi-tenant commercial models.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold">2</span>
              <span>Telemetry & Technical Data We Ingest</span>
            </h2>
            <p>
              When your microservices or backend services transmit telemetry via our SDKs or API gateways, our platform processes the following technical metadata:
            </p>
            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-slate-100">
                <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Runtime Telemetry Metrics</span>
                </div>
                <p className="text-xs text-slate-600">
                  CPU utilization, memory allocation, request latency, throughput, and error rates.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-slate-100">
                <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sanitized Crash Stack Traces</span>
                </div>
                <p className="text-xs text-slate-600">
                  Exception class names, source code line markers, and sanitized execution traces.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-slate-100">
                <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Distributed Trace Spans</span>
                </div>
                <p className="text-xs text-slate-600">
                  Service name identifiers, trace IDs, span durations, and HTTP status codes.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-slate-100">
                <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Authentication Metadata</span>
                </div>
                <p className="text-xs text-slate-600">
                  Work email, salted password hashes (PBKDF2-HMAC-SHA256), and role assignment.
                </p>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-900 flex items-start gap-2.5 mt-2">
              <EyeOff className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>PII Sanitization Guarantee:</strong> Client SDKs automatically mask sensitive headers (Authorization, Cookie, X-Api-Key) and database connection strings prior to ingestion.
              </span>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold">3</span>
              <span>Hardware Enclave & Confidential Computing Architecture</span>
            </h2>
            <p>
              As indicated throughout our infrastructure, telemetry processing and anomaly classification are performed within <strong>Hardware Security Enclaves</strong> (AMD SEV-SNP and AWS Nitro Enclaves). This provides cryptographically enforced memory encryption:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
              <li>Data in memory remains encrypted with hardware-bound AES-128/256 keys.</li>
              <li>Even root administrators or host hypervisors cannot read unencrypted telemetry payloads during live execution.</li>
              <li>Cryptographic attestation verifies platform integrity prior to decrypting telemetry streams.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold">4</span>
              <span>AI Diagnostics & Automated Root-Cause Analysis</span>
            </h2>
            <p>
              Our automated root-cause diagnostics leverage Retrieval-Augmented Generation (RAG) and Isolation Forest models. Your incident snippets, error codes, and source diffs are evaluated in ephemeral memory. No telemetry data or proprietary incident history is ever ingested by external LLMs or third-party model trainers.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold">5</span>
              <span>Data Retention & Deletion Rights</span>
            </h2>
            <p>
              We maintain configurable retention windows for all telemetry tiers:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
              <li><strong>Real-time Telemetry:</strong> Retained for 30 to 90 days depending on customer organization tier.</li>
              <li><strong>Incident Reports & Diffs:</strong> Retained for up to 365 days for historical compliance and post-mortem auditing.</li>
              <li><strong>One-Time Passcodes (OTP):</strong> Ephemeral and purged immediately upon expiry (300 seconds).</li>
            </ul>
            <p className="pt-1">
              Under GDPR (General Data Protection Regulation) and CCPA (California Consumer Privacy Act), you retain the right to request full export or permanent deletion of your organization&apos;s data at any time via your Admin portal.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold">6</span>
              <span>Contact Our Data Protection Officer (DPO)</span>
            </h2>
            <p>
              For privacy inquiries, GDPR data requests, or compliance audits, you can contact our dedicated security and compliance team:
            </p>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-slate-900 text-xs">Data Protection Officer</div>
                <div className="text-xs text-slate-500">Automatic Backend Detection Inc. · Security & Privacy Bureau</div>
              </div>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#dc2626] text-white hover:bg-[#b91c1c] text-xs font-semibold font-heading transition shadow-xs"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Contact Privacy Team</span>
              </Link>
            </div>
          </section>
        </div>
      </main>

      <AuthFooter />
    </div>
  );
}
