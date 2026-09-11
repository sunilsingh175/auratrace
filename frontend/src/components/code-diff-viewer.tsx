"use client";

import React, { useState } from "react";
import { Check, Copy, FileCode2, Sparkles } from "lucide-react";

export function CodeDiffViewer({ diffText, title = "Recommended AI Patch" }: { diffText: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  const cleanedDiff = diffText.replace(/^```(?:diff)?\s*/i, "").replace(/\s*```$/, "").trim();
  const lines = cleanedDiff ? cleanedDiff.split("\n") : [];
  const handleCopy = async () => {
    await navigator.clipboard.writeText(cleanedDiff);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <section className="panel overflow-hidden">
      <div className="panel-header">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400"><FileCode2 className="h-4 w-4" /></span>
          <div><h3 className="text-sm font-bold text-white">{title}</h3><p className="text-[10px] text-slate-500">Generated recovery guidance</p></div>
        </div>
        <button onClick={handleCopy} disabled={!cleanedDiff} className="button-secondary !px-2.5 !py-1.5">{copied ? <><Check className="h-3.5 w-3.5 text-emerald-400" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy patch</>}</button>
      </div>
      <div className="overflow-x-auto bg-slate-950 p-2 font-mono text-[10px] leading-5">
        {lines.length === 0 ? <div className="p-5 text-center text-slate-600">No code diff patch available for this incident.</div> : lines.map((line, i) => {
          let cls = "text-slate-400";
          if (line.startsWith("+")) cls = "border-l-2 border-emerald-500 bg-emerald-500/5 text-emerald-300";
          else if (line.startsWith("-")) cls = "border-l-2 border-rose-500 bg-rose-500/5 text-rose-300";
          else if (line.startsWith("@@")) cls = "bg-blue-500/5 font-semibold text-blue-300";
          return <div key={i} className={`flex min-w-max px-2 py-0.5 ${cls}`}><span className="w-8 shrink-0 pr-3 text-right text-slate-700">{i + 1}</span><span className="whitespace-pre">{line}</span></div>;
        })}
      </div>
    </section>
  );
}
