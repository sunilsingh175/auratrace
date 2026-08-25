"use client";

import React, { useState, useEffect } from "react";
import { Settings, Plus, Key, Copy, Check, Server, Shield, Sparkles, Sliders } from "lucide-react";
import { fetchServices, registerService, ServiceItem } from "@/lib/api-client";

export default function SettingsPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newServiceId, setNewServiceId] = useState("");
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceEnv, setNewServiceEnv] = useState("production");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchServices().then((data) => {
      setServices(data);
      setLoading(false);
    });
  }, []);

  const handleCopy = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(apiKey);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceId || !newServiceName) return;
    setSubmitting(true);
    const created = await registerService({
      id: newServiceId.trim(),
      name: newServiceName.trim(),
      environment: newServiceEnv,
    });
    if (created) {
      setServices((prev) => [...prev, created]);
      setShowAddModal(false);
      setNewServiceId("");
      setNewServiceName("");
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Settings className="w-5 h-5" />
            </div>
            Microservices & Configurations
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage registered services, API keys, and ML anomaly sensitivity thresholds.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors self-start sm:self-auto shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Register Service
        </button>
      </div>

      {/* Services Table */}
      <div className="bg-surface/90 border border-border rounded-xl shadow-2xl overflow-hidden">
        <div className="bg-surface-raised/80 border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-100">Registered Microservices</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">{services.length} services</span>
        </div>

        <div className="divide-y divide-border">
          {services.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <p className="text-sm">No microservices registered yet.</p>
            </div>
          ) : (
            services.map((srv) => (
              <div
                key={srv.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-raised/40 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-100">{srv.name}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] uppercase font-mono bg-blue-950 text-blue-300 border border-blue-800">
                      {srv.environment}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-cyan-400 mt-0.5">ID: {srv.id}</p>
                </div>

                <div className="flex items-center gap-2 bg-background/80 border border-border px-3 py-1.5 rounded-lg max-w-sm">
                  <Key className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-xs font-mono text-slate-300 truncate">
                    {srv.api_key}
                  </span>
                  <button
                    onClick={() => handleCopy(srv.api_key)}
                    title="Copy API Key"
                    className="p-1 text-slate-400 hover:text-slate-200 transition-colors ml-auto"
                  >
                    {copiedKey === srv.api_key ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Anomaly & RAG Configuration Settings Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ML Sensitivity */}
        <div className="bg-surface/80 border border-border rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-rose-400">
            <Sliders className="w-5 h-5" />
            <h3 className="text-sm font-bold text-slate-100">ML Anomaly Detection Sensitivity</h3>
          </div>
          <div className="space-y-3 text-xs text-slate-300">
            <div>
              <label className="text-slate-400 block mb-1">Isolation Forest Contamination (0.01 - 0.20)</label>
              <input
                type="range"
                min="0.01"
                max="0.20"
                step="0.01"
                defaultValue="0.05"
                className="w-full accent-rose-500 cursor-pointer"
              />
              <span className="text-[11px] font-mono text-slate-500 mt-1 block">
                Current: 0.05 (Expected outlier threshold 5%)
              </span>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Rolling Feature Window Size</label>
              <input
                type="text"
                disabled
                value="300 seconds (5 mins)"
                className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-slate-300"
              />
            </div>
          </div>
        </div>

        {/* AI Doctor Provider */}
        <div className="bg-surface/80 border border-border rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-cyan-400">
            <Sparkles className="w-5 h-5" />
            <h3 className="text-sm font-bold text-slate-100">RAG AI Doctor Engine</h3>
          </div>
          <div className="space-y-3 text-xs text-slate-300">
            <div>
              <label className="text-slate-400 block mb-1">Vector Embedding Model</label>
              <input
                type="text"
                disabled
                value="sentence-transformers/all-MiniLM-L6-v2 (384-dim)"
                className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Active LLM Provider</label>
              <input
                type="text"
                disabled
                value="Google Gemini / OpenAI (Auto-fallback to Heuristic)"
                className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-cyan-400 font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Add Service Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100">Register New Microservice</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddService} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Service Unique ID</label>
                <input
                  type="text"
                  placeholder="e.g. order-service"
                  value={newServiceId}
                  onChange={(e) => setNewServiceId(e.target.value)}
                  required
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Order Processing Service"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  required
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Environment</label>
                <select
                  value={newServiceEnv}
                  onChange={(e) => setNewServiceEnv(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="production">production</option>
                  <option value="staging">staging</option>
                  <option value="development">development</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-border text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                >
                  {submitting ? "Registering..." : "Save Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
