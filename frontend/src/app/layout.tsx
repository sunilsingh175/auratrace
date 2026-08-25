import type { Metadata } from "next";
import Link from "next/link";
import { Activity, AlertOctagon, Settings, ShieldAlert, Cpu, ExternalLink } from "lucide-react";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "AuraTrace - AI-Powered Observability & Crash Diagnostics",
  description: "Next-generation non-blocking telemetry ingestion, ML anomaly detection, and automated RAG self-healing root-cause diagnostics.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-slate-100 min-h-screen flex flex-col font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-50 border-b border-border/80 bg-surface/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 text-white shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-base font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-300 bg-clip-text text-transparent">
                    AuraTrace
                  </span>
                  <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    AI Doctor
                  </span>
                </div>
              </Link>

              {/* Navigation Links */}
              <nav className="hidden md:flex items-center gap-1">
                <Link
                  href="/"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-raised transition-colors flex items-center gap-1.5"
                >
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Overview
                </Link>
                <Link
                  href="/incidents"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-raised transition-colors flex items-center gap-1.5"
                >
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Incidents
                </Link>
                <Link
                  href="/settings"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-raised transition-colors flex items-center gap-1.5"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  Services & Config
                </Link>
              </nav>
            </div>

            {/* Right Meta actions */}
            <div className="flex items-center gap-3">
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded-lg border border-border bg-surface transition-colors"
              >
                API Docs
                <ExternalLink className="w-3 h-3" />
              </a>
              <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Cluster Healthy
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>

        {/* Global Footer */}
        <footer className="border-t border-border/60 bg-surface/40 py-6 text-center text-xs text-slate-500 font-mono">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>AuraTrace v1.0 • Unsupervised ML & RAG Observability Engine</span>
            <span>Final Year Capstone Project • Aligned with UN SDG Goal 9</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
