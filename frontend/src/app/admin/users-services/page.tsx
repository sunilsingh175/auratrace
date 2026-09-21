"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Server,
  Plus,
  Copy,
  Check,
  Search,
  X,
  ShieldCheck,
  Ban,
  UserCheck,
  Trash2,
  Eye,
  Calendar,
  Mail,
  User as UserIcon,
  Shield,
  KeyRound,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/context/auth-context";
import {
  fetchServices,
  registerService,
  fetchAdminUsers,
  updateUserStatus,
  deleteAdminUser,
} from "@/lib/api-client";
import { Service, UserAccount } from "@/types";

export default function AdminUsersServicesPage() {
  const [activeTab, setActiveTab] = useState<"users" | "services">("users");
  const { user: currentUser } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userError, setUserError] = useState("");
  const [userSuccess, setUserSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Modals & Drawers
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);

  // New Service Form
  const [serviceId, setServiceId] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [serviceEnv, setServiceEnv] = useState("production");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchServices()
      .then((serviceData) => {
        setServices(serviceData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const loadUsers = () => {
    setUsersLoading(true);
    setUserError("");
    fetchAdminUsers()
      .then(setUsers)
      .catch((error) =>
        setUserError(error instanceof Error ? error.message : "Unable to load users.")
      )
      .finally(() => setUsersLoading(false));
  };

  useEffect(() => {
    if (activeTab === "users") {
      loadUsers();
    }
  }, [activeTab]);

  const handleUserStatus = async (id: string, status: "Active" | "Suspended") => {
    setUserError("");
    setUserSuccess("");
    try {
      const updated = await updateUserStatus(id, status);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      if (selectedUser?.id === id) {
        setSelectedUser(updated);
      }
      setUserSuccess(`User status updated to ${status}.`);
      setTimeout(() => setUserSuccess(""), 4000);
    } catch (error) {
      setUserError(error instanceof Error ? error.message : "Unable to update user status.");
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setUserError("");
    setUserSuccess("");
    try {
      await deleteAdminUser(userToDelete.id);
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      if (selectedUser?.id === userToDelete.id) {
        setSelectedUser(null);
      }
      setUserSuccess(`User ${userToDelete.name} (${userToDelete.email}) permanently deleted.`);
      setUserToDelete(null);
      setTimeout(() => setUserSuccess(""), 4000);
    } catch (error) {
      setUserError(error instanceof Error ? error.message : "Failed to delete user.");
    } finally {
      setIsDeleting(false);
    }
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

  const copyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredUsers = users.filter((u) => {
    const q = userSearchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      u.status.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  });

  const filteredServices = services.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.environment.toLowerCase().includes(q)
    );
  });

  return (
    <ProtectedRoute role="Admin">
      <AppShell hideHeaderTitle>
        <div className="space-y-6">
          {/* Top Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  <Shield className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">Admin Operations</span>
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 font-heading md:text-3xl">
                Users & Services Management
              </h1>
            </div>
            {activeTab === "services" && (
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

          {/* Navigation Tabs */}
          <div className="flex rounded-xl border border-slate-200 bg-[#f1f4f9] p-1 max-w-sm">
            <button
              type="button"
              onClick={() => {
                setActiveTab("users");
                setUserSearchQuery("");
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
                activeTab === "users"
                  ? "bg-[#dc2626] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>User Accounts ({users.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("services");
                setSearchQuery("");
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
                activeTab === "services"
                  ? "bg-[#dc2626] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Server className="h-3.5 w-3.5" />
              <span>Services ({services.length})</span>
            </button>
          </div>

          {/* Alert Notifications */}
          {userError && (
            <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500 flex-shrink-0" />
                <span>{userError}</span>
              </div>
              <button
                type="button"
                onClick={() => setUserError("")}
                className="text-rose-500 hover:text-rose-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {userSuccess && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-700">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>{userSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => setUserSuccess("")}
                className="text-emerald-600 hover:text-emerald-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* USERS TAB */}
          {activeTab === "users" && (
            <div className="panel overflow-hidden p-0">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-red-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-heading">
                    Registered Accounts ({filteredUsers.length} / {users.length})
                  </h3>
                </div>
                <div className="relative min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search by name, email, or role..."
                    className="w-full rounded-xl border border-slate-200 bg-[#f1f4f9] py-1.5 pl-8.5 pr-3 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-red-500 focus:bg-white"
                  />
                </div>
              </div>

              {usersLoading ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                  Loading accounts from database...
                </div>
              ) : filteredUsers.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-100 bg-[#f8fafc] text-[10px] uppercase tracking-wider text-slate-400 font-heading">
                      <tr>
                        <th className="px-5 py-3.5">User</th>
                        <th className="px-5 py-3.5">Role</th>
                        <th className="px-5 py-3.5">Status</th>
                        <th className="px-5 py-3.5">Registered</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((u) => {
                        const isSelf = u.id === currentUser?.id;
                        return (
                          <tr key={u.id} className="transition hover:bg-slate-50">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold font-heading ${
                                    u.role === "Admin"
                                      ? "bg-red-50 text-red-600 border border-red-200"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {u.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()
                                    .substring(0, 2)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-bold text-slate-900 font-heading">{u.name}</p>
                                    {isSelf && (
                                      <span className="rounded bg-red-50 px-1.5 py-0.2 text-[9px] font-bold text-red-600 border border-red-200">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <p className="font-mono text-[10px] text-slate-500">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                                  u.role === "Admin"
                                    ? "bg-red-50 text-red-700 border border-red-200"
                                    : "bg-slate-100 text-slate-700 border border-slate-200"
                                }`}
                              >
                                <ShieldCheck className="h-3 w-3" />
                                {u.role}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  u.status === "Active"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    u.status === "Active" ? "bg-emerald-500" : "bg-rose-500"
                                  }`}
                                />
                                {u.status}
                              </span>
                            </td>
                            <td className="px-5 py-4 font-mono text-slate-500">{u.created_at}</td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* View Details Button */}
                                <button
                                  type="button"
                                  onClick={() => setSelectedUser(u)}
                                  title="View Account Details"
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 transition hover:bg-slate-50"
                                >
                                  <Eye className="h-3.5 w-3.5 text-red-600" />
                                  <span>Details</span>
                                </button>

                                {/* Suspend / Activate Button */}
                                {!isSelf && (
                                  <>
                                    {u.status === "Active" ? (
                                      <button
                                        type="button"
                                        onClick={() => handleUserStatus(u.id, "Suspended")}
                                        title="Suspend User Account"
                                        className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700 transition hover:bg-amber-100"
                                      >
                                        <Ban className="h-3.5 w-3.5" />
                                        <span>Suspend</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleUserStatus(u.id, "Active")}
                                        title="Activate User Account"
                                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-700 transition hover:bg-emerald-100"
                                      >
                                        <UserCheck className="h-3.5 w-3.5" />
                                        <span>Activate</span>
                                      </button>
                                    )}

                                    {/* Delete User Button */}
                                    <button
                                      type="button"
                                      onClick={() => setUserToDelete(u)}
                                      title="Permanently Delete User"
                                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700 transition hover:bg-rose-100"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      <span>Delete</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  No matching registered accounts found.
                </div>
              )}
            </div>
          )}

          {/* SERVICES TAB */}
          {activeTab === "services" && (
            <div className="panel overflow-hidden p-0">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-red-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-heading">
                    Global Registered Microservices ({services.length})
                  </h3>
                </div>
                <div className="relative min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search services..."
                    className="w-full rounded-xl border border-slate-200 bg-[#f1f4f9] py-1.5 pl-8.5 pr-3 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-red-500 focus:bg-white"
                  />
                </div>
              </div>
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading live services...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-100 bg-[#f8fafc] text-[10px] font-bold uppercase tracking-wider text-slate-400 font-heading">
                      <tr>
                        <th className="px-5 py-3.5">Service</th>
                        <th className="px-5 py-3.5">Environment</th>
                        <th className="px-5 py-3.5">Health</th>
                        <th className="px-5 py-3.5">Error Rate</th>
                        <th className="px-5 py-3.5">Open Incidents</th>
                        <th className="px-5 py-3.5">API Key Hash</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredServices.map((s) => (
                        <tr key={s.id} className="transition hover:bg-slate-50">
                          <td className="px-5 py-4">
                            <p className="font-bold text-slate-900 font-heading">{s.name}</p>
                            <p className="font-mono text-[10px] text-red-600">ID: {s.id}</p>
                          </td>
                          <td className="px-5 py-4">
                            <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-slate-600">
                              {s.environment}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                                s.status === "healthy"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : s.status === "warning"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              ● {s.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-mono font-bold text-slate-800">
                            {s.error_rate.toFixed(1)}%
                          </td>
                          <td className="px-5 py-4 font-mono font-bold">
                            {s.incident_count > 0 ? (
                              <span className="text-rose-600">{s.incident_count} open</span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {s.api_key_hash && (
                              <div className="flex max-w-xs items-center justify-between rounded-lg border border-slate-200 bg-[#f1f4f9] px-2.5 py-1 font-mono text-[10px]">
                                <span className="truncate text-slate-600">{s.api_key_hash}</span>
                                <button
                                  type="button"
                                  onClick={() => copyKey(s.api_key_hash!)}
                                  className="ml-2 text-slate-400 hover:text-slate-800"
                                >
                                  {copiedKey === s.api_key_hash ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
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
              )}
            </div>
          )}

          {/* USER DETAILS MODAL */}
          {selectedUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
              <div className="panel w-full max-w-lg border-slate-200 p-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
                      <UserIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900 font-heading">Account Details</h2>
                      <p className="text-[11px] text-slate-400">PostgreSQL record & permissions</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5 space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 font-heading">
                        Full Name
                      </span>
                      <p className="font-bold text-slate-900 font-heading">{selectedUser.name}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 font-heading">
                        Assigned Role
                      </span>
                      <span className="inline-flex items-center gap-1 font-bold text-red-600">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {selectedUser.role}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 font-heading">
                      Email Address
                    </span>
                    <div className="flex items-center gap-2 text-slate-800 font-mono">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span>{selectedUser.email}</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 font-heading">
                      Unique User UUID
                    </span>
                    <p className="font-mono text-[11px] text-slate-600 break-all">{selectedUser.id}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 font-heading">
                        Account Status
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 font-bold ${
                          selectedUser.status === "Active" ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        ● {selectedUser.status}
                      </span>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 font-heading">
                        Registration Date
                      </span>
                      <div className="flex items-center gap-1.5 text-slate-600 font-mono">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>{selectedUser.created_at}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                  {selectedUser.id !== currentUser?.id ? (
                    <div className="flex items-center gap-2">
                      {selectedUser.status === "Active" ? (
                        <button
                          type="button"
                          onClick={() => handleUserStatus(selectedUser.id, "Suspended")}
                          className="button-secondary text-amber-700 border-amber-200 bg-amber-50"
                        >
                          <Ban className="h-3.5 w-3.5" /> Suspend
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUserStatus(selectedUser.id, "Active")}
                          className="button-secondary text-emerald-700 border-emerald-200 bg-emerald-50"
                        >
                          <UserCheck className="h-3.5 w-3.5" /> Activate
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setUserToDelete(selectedUser);
                          setSelectedUser(null);
                        }}
                        className="button-secondary text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete User
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      Logged in as current session administrator.
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="button-primary ml-auto"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DELETE CONFIRMATION MODAL */}
          {userToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
              <div className="panel w-full max-w-md border-rose-200 p-6 shadow-2xl">
                <div className="flex items-center gap-3 text-rose-600">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 border border-rose-200">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 font-heading">Delete User Account</h2>
                    <p className="text-xs text-rose-600">Irreversible Action</p>
                  </div>
                </div>

                <p className="mt-4 text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to permanently delete user{" "}
                  <strong className="text-slate-900 font-heading">{userToDelete.name}</strong> (
                  <span className="font-mono text-red-600 font-semibold">{userToDelete.email}</span>)?
                </p>
                <p className="mt-2 text-[11px] text-slate-400">
                  This user will no longer be able to sign in or access telemetry dashboards.
                </p>

                <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setUserToDelete(null)}
                    className="button-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDeleteUser}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isDeleting ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Confirm Delete</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* REGISTER SERVICE MODAL */}
          {showServiceModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
              <div className="panel w-full max-w-md border-slate-200 p-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Server className="h-5 w-5 text-red-600" />
                    <h2 className="text-sm font-bold text-slate-900 font-heading">Register Monitored Service</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowServiceModal(false)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <form onSubmit={handleRegisterService} className="mt-4 space-y-4">
                  <div>
                    <label className="label font-heading">Service ID</label>
                    <input
                      required
                      value={serviceId}
                      onChange={(e) => setServiceId(e.target.value)}
                      placeholder="e.g. auth-service"
                      className="field mt-1.5 font-mono"
                    />
                  </div>
                  <div>
                    <label className="label font-heading">Service Name</label>
                    <input
                      required
                      value={serviceName}
                      onChange={(e) => setServiceName(e.target.value)}
                      placeholder="e.g. Authentication Service"
                      className="field mt-1.5"
                    />
                  </div>
                  <div>
                    <label className="label font-heading">Environment</label>
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
                  <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
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
    </ProtectedRoute>
  );
}
