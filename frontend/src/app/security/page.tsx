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
} from "lucide-react";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthFooter } from "@/components/auth/AuthFooter";

export default function SecurityArchitecturePage() {
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
            <Shield className="w-3.5 h-3.5 text-[#c51f33]" />
            <span>Cryptographic Security & Verification Model</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Security Architecture & Cryptographic Transport
          </h1>

          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
            Automatic Backend Detection leverages End-to-End Cryptographic Transport, multi-factor OTP authentication, PBKDF2 password hashing, and token authorization to protect enterprise telemetry.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4 pt-6 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold">Secure OTP Multi-Factor Authentication</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 text-slate-700 border border-slate-200">
              <Lock className="w-4 h-4 text-slate-500" />
              <span>TLS 1.3 + AES-256 + PBKDF2</span>
            </div>
          </div>
        </div>

        {/* Architecture Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Card 1 */}
          <div className="bg-white rounded-3xl p-7 border border-slate-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.04)] flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#b91c1c] flex items-center justify-center mb-5 border border-red-100">
                <Cpu className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Encrypted Ingestion & Transport Layer
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Telemetry ingestion pipelines and anomaly classifications enforce strict <strong>TLS 1.3 Encryption</strong> and constant-time API token validation. Traces are parsed and buffered in high-throughput in-memory Redis streams without unencrypted external routing.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-[#b91c1c]">
              <CheckCircle2 className="w-4 h-4" />
              <span>End-to-End Encrypted Transport</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-3xl p-7 border border-slate-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.04)] flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 border border-blue-100">
                <Lock className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Cryptographic Access & Password Hashing
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                User credentials utilize <strong>PBKDF2-HMAC-SHA256</strong> with 310,000 rounds and unique cryptographically secure 16-byte random salts. Session authentication uses HMAC-SHA256 authenticated JSON Web Tokens with ephemeral expiry.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-blue-700">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>Zero Plaintext Password Exposure</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-3xl p-7 border border-slate-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.04)] flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-5 border border-purple-100">
                <KeyRound className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Email OTP & Brute-Force Rate Limiting
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Account creation and critical sign-in events require 6-digit cryptographic OTP verification delivered via SMTP. Redis token buckets strictly enforce a 5-attempt threshold and 30-second resend cooldown to eliminate brute-force vector attacks.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-purple-700">
              <CheckCircle2 className="w-4 h-4 text-purple-600" />
              <span>Multi-Factor Verification Required</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-3xl p-7 border border-slate-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.04)] flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5 border border-emerald-100">
                <Layers className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Isolation Forest & AI Sandboxing
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Autonomous anomaly detection operates via unsupervised Isolation Forests hosted on localized sandboxes. Telemetry traces are pre-filtered to remove API tokens, authorization headers, and environment variables before analysis.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Local Sandboxed AI Ingestion</span>
            </div>
          </div>
        </div>

        {/* Security Specifications Detail Card */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.04)] space-y-6 text-sm text-slate-700 mb-8">
          <h2 className="text-xl font-bold text-slate-900">
            Security Control Matrix
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Component</th>
                  <th className="py-3 px-4">Standard / Algorithm</th>
                  <th className="py-3 px-4">Enforcement Layer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-900">Transport Security</td>
                  <td className="py-3 px-4 text-slate-600">TLS 1.3 / Perfect Forward Secrecy</td>
                  <td className="py-3 px-4 text-emerald-700 font-medium">Gateway & Ingress</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-900">Payload Encryption</td>
                  <td className="py-3 px-4 text-slate-600">AES-256-GCM / TLS In-Transit</td>
                  <td className="py-3 px-4 text-emerald-700 font-medium">Network & Broker</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-900">Password Hashing</td>
                  <td className="py-3 px-4 text-slate-600">PBKDF2-HMAC-SHA256 (310k rounds)</td>
                  <td className="py-3 px-4 text-emerald-700 font-medium">Auth Microservice</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-900">Session Tokens</td>
                  <td className="py-3 px-4 text-slate-600">HMAC-SHA256 Signed Bearer Token</td>
                  <td className="py-3 px-4 text-emerald-700 font-medium">Redis + Ingestion</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-900">API Authentication</td>
                  <td className="py-3 px-4 text-slate-600">Constant-Time HMAC Key Verification</td>
                  <td className="py-3 px-4 text-emerald-700 font-medium">SDK Client Interceptor</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Security Contact Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div>
            <h3 className="text-lg font-bold">Have a security question or report?</h3>
            <p className="text-xs text-slate-300 mt-1 max-w-lg">
              Our dedicated product security incident response team (PSIRT) is on standby 24/7 to address responsible disclosures and audit inquiries.
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
