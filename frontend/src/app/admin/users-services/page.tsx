"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Server,
  Plus,
  Shield,
  Trash2,
  CheckCircle2,
  XCircle,
  Key,
  Copy,
  Check,
  Search,
  X,
  UserPlus,
  UserCheck,
  Ban,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/context/auth-context";
import { fetchServices, registerService } from "@/lib/api-client";
import { Service } from "@/types";

export default function AdminUsersServicesPage() {
  const [activeTab, setActiveTab] = useState<"users" | "services">("users");
  const { users, addUser, deleteUser, toggleUserStatus, user: currentUser } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // User modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState<"Developer" | "Admin" | "Viewer">("Developer");

  // Service modal
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [serviceEnv, setServiceEnv] = useState("production");

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchServices().then((serviceData) => {
      setServices(serviceData);
      setLoading(false);
    });
  }, []);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail) return;
    addUser({
      name: userName,
      email: userEmail,
      role: userRole,
      status: "Active",
    });
    setUserName("");
    setUserEmail("");
    setShowUserModal(false);
  };

  const handleRegisterService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId || !serviceName) return;
    const created = await registerService({
      id: serviceId,
      name: serviceName,
      environment: serviceEnv,
    });
    setServices((prev) => [created, ...prev]);
    setServiceId("");
    setServiceName("");
    setShowServiceModal(false);
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  const filteredServices = services.filter((s) => {
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.environment.toLowerCase().includes(q);
  });

  return (
    <AppShell
      title="Users & Monitored Services Management"
      subtitle="Configure engineer access roles, master API keys and global microservice catalog"
    >
      <div className="space-y-6">
        {/* Header with Dual Tabs */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                <Users className="h-4 w-4" />
              </span>
              <span className="label">Access & Catalog Controls</span>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
              Users & Services Console
            </h1>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-3">
            {activeTab === "users" ? (
              <button
                type="button"
                onClick={() => setShowUserModal(true)}
                className="button-primary"
              >
                <UserPlus className="h-4 w-4" />
                <span>Add Engineer</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowServiceModal(true)}
                className="button-primary"
              >
                <Plus className="h-4 w-4" />
                <span>Register Service</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl border border-slate-800 bg-slate-900/60 p-1 max-w-xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab("users");
              setSearchQuery("");
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
              activeTab === "users"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Users ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("services");
              setSearchQuery("");
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
              activeTab === "services"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Server className="h-3.5 w-3.5" />
            <span>Services ({services.length})</span>
          </button>
        </div>

        {/* TAB 1: Users Table */}
        {activeTab === "users" && (
          <div className="panel overflow-hidden">
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Team Members & Access Roles ({users.length})
                </h3>
              </div>

              <div className="relative min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-1.5 pl-8.5 pr-3 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800/80 bg-slate-950/40 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">User</th>
                    <th className="px-5 py-3.5">Email</th>
                    <th className="px-5 py-3.5">Assigned Role</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Created Date</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.map((u) => {
                    const isSelf = currentUser?.id === u.id;

                    return (
                      <tr key={u.id} className="transition hover:bg-slate-800/30">
                        <td className="px-5 py-4 font-bold text-white flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 font-bold text-indigo-400 text-xs">
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span>{u.name}</span>
                            {isSelf && (
                              <span className="ml-2 rounded bg-cyan-500/10 px-1.5 py-0.2 text-[9px] font-bold text-cyan-400">
                                You
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 font-mono text-slate-400">
                          {u.email}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                              u.role === "Admin"
                                ? "bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/30"
                                : u.role === "Developer"
                                ? "bg-blue-500/10 text-cyan-400 ring-1 ring-blue-500/30"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => toggleUserStatus(u.id)}
                            title="Click to toggle status"
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold transition hover:opacity-80 ${
                              u.status === "Active"
                                ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30"
                                : "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                u.status === "Active" ? "bg-emerald-400" : "bg-rose-400"
                              }`}
                            />
                            <span>{u.status}</span>
                          </button>
                        </td>

                        <td className="px-5 py-4 text-slate-500 font-mono">
                          {u.created_at}
                        </td>

                        <td className="px-5 py-4 text-right">
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => deleteUser(u.id)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition"
                              title="Remove User"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Services Table */}
        {activeTab === "services" && (
          <div className="panel overflow-hidden">
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Global Registered Microservices ({services.length})
                </h3>
              </div>

              <div className="relative min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search services..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-1.5 pl-8.5 pr-3 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800/80 bg-slate-950/40 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Service</th>
                    <th className="px-5 py-3.5">Environment</th>
                    <th className="px-5 py-3.5">Health</th>
                    <th className="px-5 py-3.5">Error Rate</th>
                    <th className="px-5 py-3.5">Open Incidents</th>
                    <th className="px-5 py-3.5">Ingestion API Key</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredServices.map((s) => (
                    <tr key={s.id} className="transition hover:bg-slate-800/30">
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-bold text-white">{s.name}</p>
                          <p className="font-mono text-[10px] text-blue-400">ID: {s.id}</p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-slate-300">
                          {s.environment}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                            s.status === "healthy"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : s.status === "warning"
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-rose-500/10 text-rose-400"
                          }`}
                        >
                          ● {s.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-mono font-bold text-slate-200">
                        {s.error_rate.toFixed(1)}%
                      </td>

                      <td className="px-5 py-4 font-mono font-bold">
                        {s.incident_count > 0 ? (
                          <span className="text-rose-400">{s.incident_count} open</span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {s.api_key_hash && (
                          <div className="flex max-w-xs items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 font-mono text-[10px]">
                            <span className="truncate text-slate-400">{s.api_key_hash}</span>
                            <button
                              type="button"
                              onClick={() => copyKey(s.api_key_hash!)}
                              className="ml-2 text-slate-500 hover:text-white"
                            >
                              {copiedKey === s.api_key_hash ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add User Modal */}
        {showUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <div className="panel w-full max-w-md border-indigo-500/30 p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-indigo-400" />
                  <h2 className="text-sm font-bold text-white">Add Team Engineer</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
                <div>
                  <label className="label">Full Name</label>
                  <input
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    className="field mt-1.5"
                  />
                </div>

                <div>
                  <label className="label">Work Email</label>
                  <input
                    type="email"
                    required
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="alex@auratrace.io"
                    className="field mt-1.5"
                  />
                </div>

                <div>
                  <label className="label">System Role</label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as any)}
                    className="field mt-1.5"
                  >
                    <option value="Developer">Developer (Standard Workspace Only)</option>
                    <option value="Admin">Admin (Full Cluster & User Governance)</option>
                    <option value="Viewer">Viewer (Read-only)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowUserModal(false)}
                    className="button-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="button-primary">
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Service Modal */}
        {showServiceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <div className="panel w-full max-w-md border-cyan-500/30 p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-cyan-400" />
                  <h2 className="text-sm font-bold text-white">Register Monitored Service</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleRegisterService} className="mt-4 space-y-4">
                <div>
                  <label className="label">Service ID</label>
                  <input
                    type="text"
                    required
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    placeholder="e.g. auth-service"
                    className="field mt-1.5 font-mono"
                  />
                </div>

                <div>
                  <label className="label">Service Name</label>
                  <input
                    type="text"
                    required
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    placeholder="e.g. Authentication Service"
                    className="field mt-1.5"
                  />
                </div>

                <div>
                  <label className="label">Environment</label>
                  <select
                    value={serviceEnv}
                    onChange={(e) => setServiceEnv(e.target.value)}
                    className="field mt-1.5"
                  >
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowServiceModal(false)}
                    className="button-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="button-primary">
                    Register Service
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
