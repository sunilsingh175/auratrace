import type { Metadata } from "next";
import Link from "next/link";
import { Activity, BookOpen, Cpu, ExternalLink, Settings, ShieldAlert } from "lucide-react";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "AuraTrace | Intelligent Observability",
  description: "AI-powered observability and incident diagnostics platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-7">
              <Link href="/" className="flex shrink-0 items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-950/30">
                  <Cpu className="h-5 w-5" />
                </span>
                <span className="hidden sm:block">
                  <span className="block text-sm font-bold tracking-tight text-white">AuraTrace</span>
                  <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-blue-400">
                    Intelligent Observability
                  </span>
                </span>
              </Link>

              <nav className="hidden items-center gap-1 md:flex">
                <Link href="/" className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white">
                  <Activity className="h-4 w-4" /> Overview
                </Link>
                <Link href="/incidents" className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white">
                  <ShieldAlert className="h-4 w-4" /> Incidents
                </Link>
                <Link href="/settings" className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white">
                  <Settings className="h-4 w-4" /> Services
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-2.5">
              <Link href="http://localhost:8000/docs" target="_blank" className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white">
                <BookOpen className="h-3.5 w-3.5" /> API Docs <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-semibold text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> System Healthy
              </div>
            </div>
          </div>
        </header>

        <main className="page-shell mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}