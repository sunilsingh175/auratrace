"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Code2, ArrowUpRight, Copy, Check, Sparkles } from "lucide-react";

export function SdkIntegrationCards() {
  const [copiedPython, setCopiedPython] = useState(false);
  const [copiedNode, setCopiedNode] = useState(false);

  const pythonCode = `import auratrace

# Zero-config service auto-discovery & crash capture
auratrace.init(api_key=os.environ["AURATRACE_API_KEY"])`;

  const nodeCode = `import { AuraTrace } from '@auratrace/node';

// Auto-detects package.json name & captures unhandled exceptions
AuraTrace.init({ apiKey: process.env.AURATRACE_API_KEY });
app.use(AuraTrace.expressMiddleware());`;

  const copyToClipboard = (text: string, isPython: boolean) => {
    navigator.clipboard.writeText(text);
    if (isPython) {
      setCopiedPython(true);
      setTimeout(() => setCopiedPython(false), 2000);
    } else {
      setCopiedNode(true);
      setTimeout(() => setCopiedNode(false), 2000);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Card 1: Node.js / TypeScript SDK */}
      <div className="panel p-6 bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Code2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-base text-slate-900 tracking-tight">
                  Node.js / TypeScript SDK
                </h3>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 font-heading font-mono">
              npm i @auratrace/node
            </span>
          </div>

          <p className="text-xs text-slate-500 font-sans leading-relaxed mb-4">
            Zero-configuration telemetry, automatic package name detection, and automated Express middleware for
            real-time anomaly tracking.
          </p>

          <div className="relative rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs text-slate-200 leading-relaxed overflow-x-auto shadow-inner">
            <button
              type="button"
              onClick={() => copyToClipboard(nodeCode, false)}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Copy code"
            >
              {copiedNode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <pre>
              <code>
                <span className="text-purple-400">import</span> &#123;{" "}
                <span className="text-amber-300">AuraTrace</span> &#125;{" "}
                <span className="text-purple-400">from</span>{" "}
                <span className="text-emerald-300">&apos;@auratrace/node&apos;</span>;
                {"\n\n"}
                <span className="text-slate-500">// Auto-detects service name &amp; unhandled crashes</span>
                {"\n"}
                <span className="text-amber-300">AuraTrace</span>.
                <span className="text-blue-400">init</span>(&#123; apiKey: process.env.
                <span className="text-emerald-300">AURATRACE_API_KEY</span> &#125;);
                {"\n"}
                <span className="text-slate-300">app.</span>
                <span className="text-blue-400">use</span>(
                <span className="text-amber-300">AuraTrace</span>.
                <span className="text-blue-400">expressMiddleware</span>());
              </code>
            </pre>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-50 flex items-center justify-between">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#dc2626] hover:text-[#b91c1c] transition font-heading"
          >
            <span>Get Project API Key</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <span className="text-[11px] text-slate-400 font-sans">Node 18+ / TS 5+</span>
        </div>
      </div>

      {/* Card 2: Python SDK */}
      <div className="panel p-6 bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Code2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-base text-slate-900 tracking-tight">
                  Python SDK Integration
                </h3>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 font-heading font-mono">
              pip install auratrace
            </span>
          </div>

          <p className="text-xs text-slate-500 font-sans leading-relaxed mb-4">
            Zero-configuration error capture, background batch telemetry transport, and automatic crash diagnostics for
            FastAPI, Django, and Flask.
          </p>

          <div className="relative rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs text-slate-200 leading-relaxed overflow-x-auto shadow-inner">
            <button
              type="button"
              onClick={() => copyToClipboard(pythonCode, true)}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Copy code"
            >
              {copiedPython ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <pre>
              <code>
                <span className="text-purple-400">import</span>{" "}
                <span className="text-blue-300">auratrace</span>
                {"\n\n"}
                <span className="text-slate-500"># Zero-config service auto-discovery &amp; crash capture</span>
                {"\n"}
                <span className="text-blue-300">auratrace</span>.
                <span className="text-blue-400">init</span>(api_key=os.environ[
                <span className="text-emerald-300">&quot;AURATRACE_API_KEY&quot;</span>])
              </code>
            </pre>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-50 flex items-center justify-between">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#dc2626] hover:text-[#b91c1c] transition font-heading"
          >
            <span>Get Project API Key</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <span className="text-[11px] text-slate-400 font-sans">Python 3.9+</span>
        </div>
      </div>
    </div>
  );
}
