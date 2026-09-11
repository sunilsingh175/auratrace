"use client";

import React, { useEffect, useState } from "react";
import { Check, Copy, Key, Plus, Server, Settings, Sliders, Sparkles } from "lucide-react";
import { ServiceItem, fetchServices, registerService } from "@/lib/api-client";

export default function SettingsPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState("production");

  useEffect(() => { fetchServices().then((data) => { setServices(data); setLoading(false); }); }, []);
  const copyKey = async (key: string) => { await navigator.clipboard.writeText(key); setCopiedKey(key); setTimeout(() => setCopiedKey(null), 1800); };
  const addService = async (e: React.FormEvent) => {
    e.preventDefault(); if (!id.trim() || !name.trim()) return;
    setSubmitting(true);
    const created = await registerService({ id: id.trim(), name: name.trim(), environment });
    if (created) { setServices((prev) => [...prev, created]); setId(""); setName(""); setEnvironment("production"); setShowModal(false); }
    setSubmitting(false);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="label">Configuration</p><h1 className="mt-1 flex items-center gap-2.5 text-2xl font-bold tracking-tight text-white"><Settings className="h-6 w-6 text-blue-400" /> Services & configuration</h1><p className="mt-2 text-xs text-slate-500">Register services and review the active ML and RAG configuration.</p></div>
        <button onClick={() => setShowModal(true)} className="button-primary self-start sm:self-auto"><Plus className="h-4 w-4" /> Register service</button>
      </div>

      <section className="panel overflow-hidden">
        <div className="panel-header"><div className="flex items-center gap-2"><Server className="h-4 w-4 text-blue-400" /><div><h2 className="text-sm font-bold text-white">Registered microservices</h2><p className="text-[10px] text-slate-500">Services authorized to send telemetry</p></div></div><span className="font-mono text-[10px] text-slate-500">{services.length} services</span></div>
        {loading ? <div className="p-10 text-center text-xs text-slate-600">Loading services...</div> : services.length === 0 ? <div className="p-10 text-center text-xs text-slate-600">No microservices registered yet.</div> : <div className="divide-y divide-slate-800/80">{services.map((srv) => <div key={srv.id} className="flex flex-col gap-3 p-4 transition hover:bg-slate-800/20 md:flex-row md:items-center md:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-bold text-slate-200">{srv.name}</span><span className="rounded-md border border-blue-500/20 bg-blue-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-blue-300">{srv.environment}</span></div><p className="mt-1 font-mono text-[10px] text-blue-400">ID: {srv.id}</p></div><div className="flex max-w-lg items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2"><Key className="h-3.5 w-3.5 shrink-0 text-slate-600" /><span className="truncate font-mono text-[10px] text-slate-400">{srv.api_key}</span><button onClick={() => copyKey(srv.api_key)} className="ml-auto shrink-0 rounded p-1 text-slate-500 hover:text-white">{copiedKey === srv.api_key ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}</button></div></div>)}</div>}
      </section>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <section className="panel p-5"><div className="flex items-center gap-2"><Sliders className="h-4 w-4 text-amber-400" /><h2 className="text-sm font-bold text-white">ML anomaly detection</h2></div><div className="mt-5 space-y-4"><div><div className="flex items-center justify-between text-[10px] text-slate-500"><label>Isolation Forest contamination</label><span className="font-mono text-slate-300">0.05</span></div><input type="range" min="0.01" max="0.20" step="0.01" defaultValue="0.05" className="mt-2 w-full accent-blue-500" /><p className="mt-1 text-[9px] text-slate-600">Expected outlier threshold: 5%</p></div><div><label className="label">Rolling feature window</label><div className="field mt-2 text-slate-400">300 seconds (5 minutes)</div></div></div></section>
        <section className="panel p-5"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-blue-400" /><h2 className="text-sm font-bold text-white">RAG AI Doctor</h2></div><div className="mt-5 space-y-4"><div><label className="label">Embedding model</label><div className="field mt-2 font-mono text-slate-400">all-MiniLM-L6-v2 · 384 dimensions</div></div><div><label className="label">LLM provider</label><div className="field mt-2 text-blue-300">Google Gemini · configured model</div></div><div className="rounded-lg border border-blue-500/15 bg-blue-500/5 p-3 text-[10px] leading-5 text-slate-500">Historical incident context is retrieved from PostgreSQL + pgvector before diagnosis generation.</div></div></section>
      </div>

      {showModal && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"><div className="panel w-full max-w-md p-5"><div className="flex items-center justify-between"><div><p className="label">Service registry</p><h2 className="mt-1 text-base font-bold text-white">Register new service</h2></div><button onClick={() => setShowModal(false)} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-800 hover:text-white">×</button></div><form onSubmit={addService} className="mt-5 space-y-4"><div><label className="label">Service ID</label><input value={id} onChange={(e) => setId(e.target.value)} required className="field mt-2" placeholder="order-service" /></div><div><label className="label">Display name</label><input value={name} onChange={(e) => setName(e.target.value)} required className="field mt-2" placeholder="Order Processing Service" /></div><div><label className="label">Environment</label><select value={environment} onChange={(e) => setEnvironment(e.target.value)} className="field mt-2"><option>production</option><option>staging</option><option>development</option></select></div><div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowModal(false)} className="button-secondary">Cancel</button><button disabled={submitting} type="submit" className="button-primary">{submitting ? "Registering..." : "Register service"}</button></div></form></div></div>}
    </div>
  );
}
