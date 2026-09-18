"use client";

import React, { useState, useEffect } from "react";
import { Users, Server, Plus, Copy, Check, Search, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/context/auth-context";
import { fetchServices, registerService } from "@/lib/api-client";
import { Service } from "@/types";

export default function AdminUsersServicesPage() {
  const [activeTab, setActiveTab] = useState<"users" | "services">("users");
  const { user: currentUser } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [serviceEnv, setServiceEnv] = useState("production");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchServices().then((serviceData) => {
      setServices(serviceData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleRegisterService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId || !serviceName) return;
    const created = await registerService({ id: serviceId, name: serviceName, environment: serviceEnv });
    setServices((prev) => [created, ...prev]);
    setServiceId("");
    setServiceName("");
    setShowServiceModal(false);
  };

  const copyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredServices = services.filter((s) => {
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.environment.toLowerCase().includes(q);
  });

  return (
    <AppShell title="Users & Monitored Services Management" subtitle="View the authenticated account and manage the live monitored service catalog">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400"><Users className="h-4 w-4" /></span>
              <span className="label">Access & Catalog</span>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white md:text-3xl">Users & Services Console</h1>
          </div>
          {activeTab === "services" && (
            <button type="button" onClick={() => setShowServiceModal(true)} className="button-primary">
              <Plus className="h-4 w-4" /><span>Register Service</span>
            </button>
          )}
        </div>

        <div className="flex rounded-xl border border-slate-800 bg-slate-900/60 p-1 max-w-xs">
          <button type="button" onClick={() => { setActiveTab("users"); setSearchQuery(""); }} className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold ${activeTab === "users" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}>
            <Users className="h-3.5 w-3.5" /><span>Account</span>
          </button>
          <button type="button" onClick={() => { setActiveTab("services"); setSearchQuery(""); }} className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold ${activeTab === "services" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}>
            <Server className="h-3.5 w-3.5" /><span>Services ({services.length})</span>
          </button>
        </div>

        {activeTab === "users" && (
          <div className="panel p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Authenticated Account</h3>
                <p className="text-xs text-slate-500">Account identity comes from the current authentication session. Team-user CRUD is not enabled because no backend user registry exists.</p>
              </div>
            </div>
            {currentUser ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><p className="label">Name</p><p className="mt-1 text-sm font-bold text-white">{currentUser.name}</p></div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><p className="label">Email</p><p className="mt-1 font-mono text-sm text-slate-300">{currentUser.email}</p></div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><p className="label">Role</p><p className="mt-1 text-sm font-bold text-indigo-400">{currentUser.role}</p></div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><p className="label">Session Status</p><p className="mt-1 text-sm font-bold text-emerald-400">Active</p></div>
              </div>
            ) : (
              <p className="mt-6 rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-xs text-slate-500">No authenticated account is available.</p>
            )}
          </div>
        )}

        {activeTab === "services" && (
          <div className="panel overflow-hidden">
            <div className="panel-header">
              <div className="flex items-center gap-2"><Server className="h-4 w-4 text-cyan-400" /><h3 className="text-xs font-bold uppercase tracking-wider text-white">Global Registered Microservices ({services.length})</h3></div>
              <div className="relative min-w-[200px]"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" /><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search services..." className="w-full rounded-xl border border-slate-800 bg-slate-950 py-1.5 pl-8.5 pr-3 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-500" /></div>
            </div>
            {loading ? <div className="p-8 text-center text-xs text-slate-500">Loading live services...</div> : (
              <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="border-b border-slate-800/80 bg-slate-950/40 text-[10px] font-bold uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3.5">Service</th><th className="px-5 py-3.5">Environment</th><th className="px-5 py-3.5">Health</th><th className="px-5 py-3.5">Error Rate</th><th className="px-5 py-3.5">Open Incidents</th><th className="px-5 py-3.5">API Key Hash</th></tr></thead>
              <tbody className="divide-y divide-slate-800/60">{filteredServices.map((s) => <tr key={s.id} className="transition hover:bg-slate-800/30"><td className="px-5 py-4"><p className="font-bold text-white">{s.name}</p><p className="font-mono text-[10px] text-blue-400">ID: {s.id}</p></td><td className="px-5 py-4"><span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-slate-300">{s.environment}</span></td><td className="px-5 py-4"><span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${s.status === "healthy" ? "bg-emerald-500/10 text-emerald-400" : s.status === "warning" ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400"}`}>● {s.status}</span></td><td className="px-5 py-4 font-mono font-bold text-slate-200">{s.error_rate.toFixed(1)}%</td><td className="px-5 py-4 font-mono font-bold">{s.incident_count > 0 ? <span className="text-rose-400">{s.incident_count} open</span> : <span className="text-slate-500">0</span>}</td><td className="px-5 py-4">{s.api_key_hash && <div className="flex max-w-xs items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 font-mono text-[10px]"><span className="truncate text-slate-400">{s.api_key_hash}</span><button type="button" onClick={() => copyKey(s.api_key_hash!)} className="ml-2 text-slate-500 hover:text-white">{copiedKey === s.api_key_hash ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}</button></div>}</td></tr>)}</tbody></table></div>
            )}
          </div>
        )}

        {showServiceModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"><div className="panel w-full max-w-md border-cyan-500/30 p-6 shadow-2xl"><div className="flex items-center justify-between border-b border-slate-800 pb-3"><div className="flex items-center gap-2"><Server className="h-5 w-5 text-cyan-400" /><h2 className="text-sm font-bold text-white">Register Monitored Service</h2></div><button type="button" onClick={() => setShowServiceModal(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-white"><X className="h-4 w-4" /></button></div><form onSubmit={handleRegisterService} className="mt-4 space-y-4"><div><label className="label">Service ID</label><input required value={serviceId} onChange={(e) => setServiceId(e.target.value)} placeholder="e.g. auth-service" className="field mt-1.5 font-mono" /></div><div><label className="label">Service Name</label><input required value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="e.g. Authentication Service" className="field mt-1.5" /></div><div><label className="label">Environment</label><select value={serviceEnv} onChange={(e) => setServiceEnv(e.target.value)} className="field mt-1.5"><option value="production">Production</option><option value="staging">Staging</option><option value="development">Development</option></select></div><div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-2"><button type="button" onClick={() => setShowServiceModal(false)} className="button-secondary">Cancel</button><button type="submit" className="button-primary">Register Service</button></div></form></div></div>}
      </div>
    </AppShell>
  );
}
