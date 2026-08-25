"use client";

import React, { useState } from "react";
import { Check, Copy, FileCode2, Sparkles } from "lucide-react";

interface CodeDiffViewerProps {
  diffText: string;
  title?: string;
}

export function CodeDiffViewer({ diffText, title = "Recommended AI Patch" }: CodeDiffViewerProps) {
  const [copied, setCopied] = useState(false);

  // Clean raw diff text of markdown backticks if present
  const cleanedDiff = diffText
    .replace(/^```diff\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const lines = cleanedDiff.split("\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanedDiff);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-950 border border-border rounded-xl overflow-hidden shadow-2xl">
      {/* Diff Header */}
      <div className="bg-surface-raised/90 border-b border-border px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-cyan-500/10 text-cyan-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-200 tracking-wide">
            {title}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface hover:bg-slate-800 border border-border text-xs text-slate-300 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy Patch</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body */}
      <div className="p-3 font-mono text-xs overflow-x-auto leading-relaxed divide-y divide-slate-900/40">
        {lines.length === 0 || !cleanedDiff ? (
          <div className="text-slate-500 text-center py-6">
            No code diff patch available for this incident.
          </div>
        ) : (
          lines.map((line, idx) => {
            let lineClass = "text-slate-300 bg-transparent";
            let prefixBg = "";

            if (line.startsWith("+")) {
              lineClass = "bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500";
              prefixBg = "text-emerald-400 font-bold";
            } else if (line.startsWith("-")) {
              lineClass = "bg-rose-950/40 text-rose-300 border-l-2 border-rose-500";
              prefixBg = "text-rose-400 font-bold";
            } else if (line.startsWith("@")) {
              lineClass = "bg-cyan-950/30 text-cyan-300 font-semibold";
            } else if (line.startsWith("diff ") || line.startsWith("---") || line.startsWith("+++")) {
              lineClass = "text-slate-400 font-semibold";
            }

            return (
              <div key={idx} className={`flex items-start px-2 py-0.5 ${lineClass}`}>
                <span className="w-8 text-[10px] text-slate-600 select-none text-right pr-3 shrink-0">
                  {idx + 1}
                </span>
                <span className="whitespace-pre flex-1">{line}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
