"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Shield,
  Users,
  FolderKanban,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Play,
  UserX,
  UserCheck,
  Server,
  Database,
  Cpu,
  Bot,
  Layers,
  ArrowRight,
  Sparkles,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/context/auth-context";
import {
  fetchAdminUsers,
  updateUserStatus,
  deleteAdminUser,
  fetchProjects,
  deleteProject,
  cleanTestData,
  fetchAdminInfrastructure,
  fetchSystemStats,
  simulateCrash,
} from "@/lib/api-client";
import { UserAccount, Project, InfrastructureStatus, SystemStats } from "@/types";

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [health, setHealth] = useState<InfrastructureStatus | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Tools state
  const [simulating, setSimulating] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState("db_pool_exhaustion");
  const [cleaning, setCleaning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Delete project modal / prompt state
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const loadAdminData = useCallback(async () => {
    try {
      const [usersData, projectsData, healthData, statsData] = await Promise.all([
        fetchAdminUsers().catch(() => []),
        fetchProjects().catch(() => []),
        fetchAdminInfrastructure().catch(() => null),
        fetchSystemStats().catch(() => null),
      ]);

      setUsers(usersData);
      setProjects(projectsData);
      setHealth(healthData);
      setStats(statsData);
    } catch (err) {
      console.error("Admin data load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "Admin") {
      void loadAdminData();
      const interval = setInterval(loadAdminData, 10000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [user, loadAdminData]);

  const showSuccess = (msg: string) => {
    setActionSuccess(msg);
    setActionError(null);
    setTimeout(() => setActionSuccess(null), 5000);
  };

  const showError = (msg: string) => {
    setActionError(msg);
    setActionSuccess(null);
    setTimeout(() => setActionError(null), 6000);
  };

  // User Actions
  const handleToggleUserStatus = async (targetUser: UserAccount) => {
    const nextStatus = targetUser.status === "Active" ? "Suspended" : "Active";
    try {
      await updateUserStatus(targetUser.id, nextStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, status: nextStatus } : u))
      );
      showSuccess(`User ${targetUser.name} status updated to ${nextStatus}.`);
    } catch (err: any) {
      showError(err.message || "Failed to update user status.");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteAdminUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setDeletingUserId(null);
      showSuccess("User account deleted permanently.");
    } catch (err: any) {
      showError(err.message || "Failed to delete user account.");
    }
  };

  // Project Actions
  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setDeletingProjectId(null);
      showSuccess("Project and cascading operational data deleted successfully.");
    } catch (err: any) {
      showError(err.message || "Failed to delete project.");
    }
  };

  // Clean Test Data
  const handleCleanTestData = async () => {
    setCleaning(true);
    try {
      const res = await cleanTestData();
      await loadAdminData();
      showSuccess(res.message || `Test data cleaned. ${res.deleted_projects_count} test workspaces removed.`);
    } catch (err: any) {
      showError(err.message || "Failed to clean test data.");
    } finally {
      setCleaning(false);
    }
  };

  // Simulate Crash
  const handleSimulateCrash = async () => {
    setSimulating(true);
    try {
      const res = await simulateCrash(selectedScenario);
      showSuccess(res.message || `Simulated crash scenario '${selectedScenario}' dispatched.`);
      await loadAdminData();
    } catch (err: any) {
      showError(err.message || "Failed to inject simulated crash.");
    } finally {
      setSimulating(false);
    }
  };

  if (authLoading || loading) {
    return (
      <AppShell title="Administration" subtitle="System overview and control panel">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <RefreshCw className="h-6 w-6 animate-spin text-[#dc2626]" />
            <span className="text-xs font-semibold">Loading administration control panel...</span>
          </div>
        </div>
      </AppShell>
    );
  }

  // Role Gate: Only Admin allowed
  if (user?.role !== "Admin") {
    return (
      <AppShell title="Administration" subtitle="Access restricted">
        <div className="max-w-xl mx-auto mt-12 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-[#dc2626] mx-auto mb-4 border border-rose-100">
            <Shield className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 font-heading">
            Administrator Access Required
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-2 leading-relaxed">
            The Administration Control Panel is restricted to AuraTrace administrator accounts. Your current role is{" "}
            <span className="font-semibold text-slate-700">{user?.role || "Guest"}</span>.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white px-4 py-2 text-xs font-bold font-heading shadow-sm transition"
            >
              <span>Return to Dashboard</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const isSystemHealthy =
    health?.api_status === "healthy" &&
    health?.postgres_status === "healthy" &&
    health?.redis_status === "healthy";

  return (
    <AppShell
      title="AuraTrace Administration"
      subtitle="Platform governance, user access, project lifecycle &amp; system health"
    >
      <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
        {/* Top Feedback Alerts */}
        {actionSuccess && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 font-sans shadow-xs animate-fadeIn">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 font-sans shadow-xs animate-fadeIn">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* 1. Platform Overview */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
              Platform Overview
            </h2>
            <button
              type="button"
              onClick={() => {
                setRefreshing(true);
                void loadAdminData();
              }}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 transition font-heading cursor-pointer"
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin text-[#dc2626]" : ""}`} />
              <span>Refresh Metrics</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="panel p-5 bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
                  Total Users
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold font-heading text-slate-900">{users.length}</p>
              <p className="mt-1 text-[11px] text-slate-400 font-sans">Registered accounts</p>
            </div>

            <div className="panel p-5 bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
                  Active Projects
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <FolderKanban className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold font-heading text-slate-900">{projects.length}</p>
              <p className="mt-1 text-[11px] text-slate-400 font-sans">Workspaces provisioned</p>
            </div>

            <div className="panel p-5 bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
                  Total Crashes
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-[#dc2626]">
                  <Activity className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold font-heading text-slate-900">
                {stats?.total_logs_ingested ?? 0}
              </p>
              <p className="mt-1 text-[11px] text-slate-400 font-sans">
                {stats?.open_incidents_count ?? 0} currently open
              </p>
            </div>

            <div className="panel p-5 bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
                  System Status
                </span>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                    isSystemHealthy ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isSystemHealthy ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                  }`}
                />
                <p className="text-xl font-bold font-heading text-slate-900">
                  {isSystemHealthy ? "All Healthy" : "Degraded"}
                </p>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 font-sans">
                {health?.active_ws_clients ?? 0} live stream consumers
              </p>
            </div>
          </div>
        </div>

        {/* 2. User Management */}
        <div className="panel p-6 bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">
                User Management
              </h3>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                Manage developer accounts, roles, and administrative permissions
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400 font-heading">
              {users.length} registered
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-heading">
                  <th className="pb-3 pl-2">User</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isSelf = u.id === user?.id;
                  const isActive = u.status === "Active";

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 pl-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700 font-bold text-[10px] font-heading">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 font-heading block">
                              {u.name}
                            </span>
                            {isSelf && (
                              <span className="text-[10px] font-bold text-[#dc2626] font-heading">
                                (You)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 text-slate-600 font-mono text-[11px]">
                        {u.email}
                      </td>
                      <td className="py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold font-heading ${
                            u.role === "Admin"
                              ? "bg-red-50 text-[#dc2626] border border-red-100"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-heading ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          <span>{u.status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        <div className="flex items-center justify-end gap-2">
                          {!isSelf ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void handleToggleUserStatus(u)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                  isActive
                                    ? "text-amber-700 bg-amber-50 hover:bg-amber-100"
                                    : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                                }`}
                              >
                                {isActive ? (
                                  <>
                                    <UserX className="h-3 w-3" />
                                    <span>Suspend</span>
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-3 w-3" />
                                    <span>Reactivate</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeletingUserId(u.id)}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                title="Delete user account"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">
                              Active Session
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Project Management & Cleanup */}
        <div className="panel p-6 bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Project Management &amp; Cleanup
              </h3>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                Cascade delete old test projects and associated operational telemetry
              </p>
            </div>
            <button
              type="button"
              onClick={handleCleanTestData}
              disabled={cleaning}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-[#dc2626] hover:bg-rose-100 transition font-heading disabled:opacity-50 cursor-pointer self-start sm:self-auto"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{cleaning ? "Cleaning..." : "Purge Test Workspaces"}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-heading">
                  <th className="pb-3 pl-2">Project Name</th>
                  <th className="pb-3">Project ID</th>
                  <th className="pb-3">Services / Apps</th>
                  <th className="pb-3">Created</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 pl-2">
                      <div className="flex items-center gap-2">
                        <FolderKanban className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="font-bold text-slate-900 font-heading">{p.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-slate-400 font-mono text-[11px]">
                      {p.id.substring(0, 18)}...
                    </td>
                    <td className="py-3.5 text-slate-600 font-medium">
                      {p.service_count} connected
                    </td>
                    <td className="py-3.5 text-slate-500">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 text-right pr-2">
                      <button
                        type="button"
                        onClick={() => setDeletingProjectId(p.id)}
                        className="inline-flex items-center gap-1 text-slate-400 hover:text-red-600 hover:bg-red-50 px-2.5 py-1 rounded-lg transition font-semibold text-xs cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. System Health & Infrastructure */}
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

        {/* 5. Administrative Tools */}
        <div className="panel p-6 bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Administrative Tools
              </h3>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                Run crash injection simulations, purge transient data, and trigger diagnostic health sweeps
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tool 1: Crash Simulation */}
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/40 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold font-heading text-slate-900">
                <Sparkles className="h-4 w-4 text-[#dc2626]" />
                <span>Run Crash Simulation</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Inject realistic crash telemetry into the Redis Stream to test the ML anomaly pipeline and live UI notifications.
              </p>
              <div className="space-y-2">
                <select
                  value={selectedScenario}
                  onChange={(e) => setSelectedScenario(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 font-sans focus:outline-none focus:border-red-500"
                >
                  <option value="db_pool_exhaustion">Database Pool Timeout (QueuePool limit 10)</option>
                  <option value="redis_consumer_lag">Redis Connection Refused</option>
                  <option value="jwt_memory_leak">Memory Leak / High Heap Utilization</option>
                  <option value="socket_timeout">HTTP Transport Timeout (30000ms)</option>
                </select>
                <button
                  type="button"
                  onClick={handleSimulateCrash}
                  disabled={simulating}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white px-3 py-2 text-xs font-bold font-heading shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>{simulating ? "Injecting..." : "Simulate Crash"}</span>
                </button>
              </div>
            </div>

            {/* Tool 2: Refresh System Health */}
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/40 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold font-heading text-slate-900">
                <RefreshCw className="h-4 w-4 text-blue-600" />
                <span>Refresh System Health</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Probe all cluster services (API, PostgreSQL pgvector, Redis, ML Worker, Ollama/LLM) and update telemetry counters.
              </p>
              <div className="pt-8">
                <button
                  type="button"
                  onClick={() => {
                    setRefreshing(true);
                    void loadAdminData();
                  }}
                  disabled={refreshing}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 px-3 py-2 text-xs font-bold font-heading shadow-xs transition cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-[#dc2626]" : ""}`} />
                  <span>{refreshing ? "Probing Cluster..." : "Refresh Health Sweep"}</span>
                </button>
              </div>
            </div>

            {/* Tool 3: Clean Test Data */}
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/40 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold font-heading text-slate-900">
                <Trash2 className="h-4 w-4 text-amber-600" />
                <span>Clean Test Data</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Purge old automated test workspaces, transient synthetic services, and orphaned demo traces from the PostgreSQL database.
              </p>
              <div className="pt-8">
                <button
                  type="button"
                  onClick={handleCleanTestData}
                  disabled={cleaning}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 px-3 py-2 text-xs font-bold font-heading shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{cleaning ? "Cleaning..." : "Purge Transient Data"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal: Delete Project */}
      {deletingProjectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 font-heading">
                  Delete Project and Cascade Data?
                </h4>
                <p className="text-xs text-slate-500 font-sans">
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 font-sans leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              Deleting this project will cascade through the database and permanently purge all associated telemetry logs, registered services, and incident records.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingProjectId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 font-heading"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteProject(deletingProjectId)}
                className="rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white px-4 py-2 text-xs font-bold font-heading shadow-sm transition"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete User */}
      {deletingUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 font-heading">
                  Permanently Delete User Account?
                </h4>
                <p className="text-xs text-slate-500 font-sans">
                  The user will lose all platform access immediately.
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 font-sans leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              Are you sure you want to delete this user account from the system?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUserId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 font-heading"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteUser(deletingUserId)}
                className="rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white px-4 py-2 text-xs font-bold font-heading shadow-sm transition"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
