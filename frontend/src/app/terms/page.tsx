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
} from "lucide-react";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthFooter } from "@/components/auth/AuthFooter";

export default function TermsOfServicePage() {
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
            <FileText className="w-3.5 h-3.5" />
            <span>Enterprise Agreement</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Terms of Service
          </h1>

          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
            These terms govern your access to and use of the Automatic Backend Detection Platform, telemetry ingestion APIs, anomaly detection services, and automated diagnostics engines.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-6 pt-6 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Version: 2026.3 · Effective: {lastUpdated}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-blue-700 font-medium">99.99% Availability SLA</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700 font-medium">Encrypted Telemetry Assured</span>
            </div>
          </div>
        </div>

        {/* Terms Content Sections */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.04)] space-y-10 text-sm leading-relaxed text-slate-700">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold">1</span>
              <span>Acceptance & Description of Service</span>
            </h2>
            <p>
              By accessing, registering for, or connecting services to <strong>Automatic Backend Detection Inc.</strong> (“Platform”), you agree to be bound by these Terms of Service. If you are accepting on behalf of an entity, you represent and warrant that you possess the organizational authority to bind that entity.
            </p>
            <p>
              The Platform provides real-time distributed telemetry ingestion, unsupervised Isolation Forest anomaly detection, automated root-cause crash synthesis, and self-healing diagnostic code generation.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold">2</span>
              <span>Account Credentials & Multi-Factor Security</span>
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials, API ingestion keys, and administrative master tokens. You agree to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
              <li>Provide accurate, current work email and corporate entity details.</li>
              <li>Complete mandatory Email OTP verification upon account activation or critical access events.</li>
              <li>Immediately notify us of any unauthorized compromise of your ingestion API keys or account credentials.</li>
              <li>Restrict administrative master keys solely to designated DevOps and SRE team leads.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold">3</span>
              <span>Telemetry Ingestion & Acceptable Use</span>
            </h2>
            <p>
              You agree to use our telemetry ingestion endpoints and SDKs in compliance with all applicable laws and fair use policies. You shall not:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
              <li>Transmit unmasked plaintext credit card numbers, government IDs, or raw patient records through diagnostic telemetry payloads.</li>
              <li>Attempt to reverse-engineer or circumvent platform security, authentication tokens, or rate-limiting systems.</li>
              <li>Launch denial-of-service or volumetric attacks against the telemetry ingestion cluster.</li>
              <li>Use the Platform to monitor unauthorized infrastructure without appropriate legal ownership.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold">4</span>
              <span>Autonomous Diagnostics & AI Recommendations</span>
            </h2>
            <p>
              The Platform provides machine-learning-driven crash diagnostics, root-cause recommendations, and suggested code patches. While our models are tested extensively on distributed systems, all remediation patches, deployment rollbacks, or automated configuration changes remain subject to your engineering team&apos;s review and discretion.
            </p>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <strong>Remediation Notice:</strong> Automatic Backend Detection Inc. is not liable for secondary regressions resulting from automated pull requests or hotpatches merged without proper CI/CD verification.
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold">5</span>
              <span>Service Level Agreement (SLA)</span>
            </h2>
            <p>
              We commit to maintaining a <strong>99.99% monthly uptime SLA</strong> for our telemetry ingestion endpoints and real-time anomaly alerting pipelines. In the event of an unscheduled outage exceeding our SLA commitment, enterprise accounts are eligible for proportional service credits as defined in their enterprise schedule.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold">6</span>
              <span>Intellectual Property & Ownership</span>
            </h2>
            <p>
              <strong>Your Data:</strong> You retain complete, unrestricted ownership of your telemetry data, source code repositories, and proprietary crash logs.
            </p>
            <p>
              <strong>Platform IP:</strong> Automatic Backend Detection Inc. retains all rights, title, and intellectual property in our proprietary Isolation Forest algorithms, diagnostic models, SDKs, and user interface.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold">7</span>
              <span>Governing Law & Legal Contact</span>
            </h2>
            <p>
              These Terms are governed by and construed under applicable corporate commercial laws. For contractual questions or compliance notices, reach our legal counsel at:
            </p>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-slate-900 text-xs">Legal & Compliance Department</div>
                <div className="text-xs text-slate-500">Automatic Backend Detection Inc. · Enterprise Legal Office</div>
              </div>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#dc2626] text-white hover:bg-[#b91c1c] text-xs font-semibold font-heading transition shadow-xs"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Contact Legal Department</span>
              </Link>
            </div>
          </section>
        </div>
      </main>

      <AuthFooter />
    </div>
  );
}
