"use client";

import React from "react";
import Link from "next/link";
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Zap,
  Clock,
  ArrowLeft,
  Mail,
  Code,
  Key,
} from "lucide-react";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthFooter } from "@/components/auth/AuthFooter";

export default function TermsOfServicePage() {
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
            <FileText className="w-3.5 h-3.5" />
            <span>Platform Terms & Guidelines</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-heading">
            Terms of Service
          </h1>

          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl font-sans">
            These terms outline the rules and responsibilities for using the AutoTrace platform, SDK telemetry ingestion, and AI diagnostic assistance.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-6 pt-6 border-t border-slate-100 text-xs text-slate-500 font-sans">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Effective: {lastUpdated}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-slate-400" />
              <span>Autonomous Observability & Developer Guidance</span>
            </div>
          </div>
        </div>

        {/* Terms Content Sections */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.04)] space-y-10 text-sm leading-relaxed text-slate-700 font-sans">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5 font-heading">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold font-heading">1</span>
              <span>User Account & Access Responsibility</span>
            </h2>
            <p>
              Users are responsible for maintaining the confidentiality of their login credentials and account access. You agree to provide accurate information upon registration, verify account identity via Email OTP, and safeguard any administrative credentials.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5 font-heading">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold font-heading">2</span>
              <span>Project Isolation & API Key Management</span>
            </h2>
            <p>
              Each application workspace is assigned a dedicated API Key (e.g., <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">AUTOTRACE_API_KEY</code>). You are responsible for keeping your API keys secure and regenerating keys if an unauthorized disclosure occurs.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5 font-heading">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold font-heading">3</span>
              <span>SDK Usage & Telemetry Transmission</span>
            </h2>
            <p>
              AutoTrace provides client SDKs for Node.js and Python. You agree to deploy SDKs in accordance with provided documentation and avoid transmitting unsolicited sensitive data, raw database dumps, or credentials in error logs.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5 font-heading">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold font-heading">4</span>
              <span>Acceptable Use</span>
            </h2>
            <p>
              You agree not to use the AutoTrace platform to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
              <li>Transmit intentional malware, malicious payloads, or unmasked credentials.</li>
              <li>Attempt to circumvent API key authentication, rate limits, or role-based access control.</li>
              <li>Engage in denial-of-service attempts against the ingestion API gateway or message brokers.</li>
            </ul>
          </section>

          {/* Section 5 - AI Recommendations Clause */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5 font-heading">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold font-heading">5</span>
              <span>Responsibility for AI-Generated Diagnoses & Code Fixes</span>
            </h2>
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm leading-relaxed font-sans">
              <strong>Important Notice:</strong> AI-generated diagnoses and code recommendations are provided as developer assistance. Users are responsible for reviewing, testing, and applying any suggested changes to their applications.
            </div>
            <p>
              AutoTrace provides diagnostic synthesis using machine learning and historical vector similarity. There is no guarantee that an AI-generated recommendation will resolve every problem or error condition.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5 font-heading">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold font-heading">6</span>
              <span>No Automatic Code Modification</span>
            </h2>
            <p>
              AutoTrace performs purely read-only diagnostic telemetry analysis. The platform does not automatically deploy, edit, push, or modify your application&apos;s source code or production repositories.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5 font-heading">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold font-heading">7</span>
              <span>Service Limitations & Termination</span>
            </h2>
            <p>
              As a final-year engineering system and developer tool, AutoTrace is provided &ldquo;as is&rdquo; without warranties of uninterrupted availability. Administrators reserve the right to suspend accounts or throttle ingestion in the event of abusive or excessive telemetry traffic.
            </p>
          </section>
        </div>
      </main>

      <AuthFooter />
    </div>
  );
}
