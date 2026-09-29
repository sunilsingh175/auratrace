"use client";

import React from "react";
import Link from "next/link";
import { Github, BookOpen, ShieldCheck, Heart } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function PublicFooter() {
  return (
    <footer className="w-full border-t border-slate-100 bg-white py-12 mt-16 text-slate-600 font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1: Brand & Tagline */}
          <div className="md:col-span-2 space-y-3">
            <BrandLogo size="md" href="/" />
            <p className="text-xs text-slate-500 leading-relaxed max-w-md">
              AuraTrace is an open-source autonomous debugging and telemetry observability SDK.
              Captures runtime crashes, detects distribution anomalies using Isolation Forest, and grounds
              root-cause diagnostics with historical fix retrieval.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                MIT Licensed • v1.0.0
              </span>
              <a
                href="https://github.com/sunilsingh175/auratrace"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 transition font-medium"
              >
                <Github className="h-3.5 w-3.5" />
                <span>GitHub Repository</span>
              </a>
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 font-heading mb-3">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-red-600 transition">
                  Overview
                </Link>
              </li>
              <li>
                <Link href="/project" className="hover:text-red-600 transition">
                  Project Specification
                </Link>
              </li>
              <li>
                <Link href="/docs" className="hover:text-red-600 transition">
                  SDK Documentation
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Supported SDKs */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 font-heading mb-3">
              Supported SDKs
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="font-medium text-slate-800">Python</span>
                <span className="text-[10px] text-slate-400 font-mono">pip install auratrace</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="font-medium text-slate-800">Node.js</span>
                <span className="text-[10px] text-slate-400 font-mono">npm i @auratrace/node</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <p>© 2026 AuraTrace. Open-Source Final Year Project Architecture.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-slate-600 transition">
              Privacy
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-slate-600 transition">
              Terms
            </Link>
            <span>•</span>
            <Link href="/security" className="hover:text-slate-600 transition">
              Security
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default PublicFooter;
