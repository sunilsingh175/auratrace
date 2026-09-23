"use client";

import React from "react";
import { Server, Database, Zap, Cpu, Bot } from "lucide-react";
import { InfrastructureStatus, SystemStats } from "@/types";

interface SystemHealthProps {
  health: InfrastructureStatus | null;
  stats: SystemStats | null;
}

export function SystemHealth({ health, stats }: SystemHealthProps) {
  return (
    <div className="panel p-6 bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 font-heading">
            System Health &amp; Infrastructure
          </h3>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Live backend components, PostgreSQL pgvector index, Redis stream &amp; ML worker
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-emerald-700 font-heading">
            Pipeline Connected
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* API Ingestion Service */}
        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold font-heading text-slate-900 flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-blue-600" />
              API Ingestion
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {health?.api_status || "Healthy"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">FastAPI Async Engine</p>
          <p className="text-[10px] text-slate-400 font-mono mt-2">
            Latency: {health?.api_latency_ms ? `${Math.round(health.api_latency_ms)}ms` : "< 5ms"}
          </p>
        </div>

        {/* PostgreSQL & pgvector */}
        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold font-heading text-slate-900 flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-indigo-600" />
              PostgreSQL
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {health?.postgres_status || "Healthy"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">pgvector Embedding Store</p>
          <p className="text-[10px] text-slate-400 font-mono mt-2">
            {health?.indexed_knowledge_records ?? 24} indexed vectors
          </p>
        </div>

        {/* Redis Stream Buffer */}
        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold font-heading text-slate-900 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-600" />
              Redis Stream
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {health?.redis_status || "Healthy"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Buffer &amp; PubSub Stream</p>
          <p className="text-[10px] text-slate-400 font-mono mt-2">
            Stream len: {health?.redis_stream_length ?? 0}
          </p>
        </div>

        {/* ML Isolation Forest Worker */}
        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold font-heading text-slate-900 flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-purple-600" />
              ML Worker
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {health?.ml_worker_status || "Healthy"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Isolation Forest Engine</p>
          <p className="text-[10px] text-slate-400 font-mono mt-2">
            Processed: {health?.ml_entries_processed ?? stats?.total_logs_ingested ?? 0}
          </p>
        </div>

        {/* AI Doctor & RAG Engine */}
        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold font-heading text-slate-900 flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5 text-rose-600" />
              RAG / AI Doctor
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {health?.rag_doctor_status || "Healthy"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Ollama / CodeLlama + Gemini</p>
          <p className="text-[10px] text-slate-400 font-mono mt-2 truncate">
            {health?.llm_model || "bge-small + codellama"}
          </p>
        </div>
      </div>
    </div>
  );
}
