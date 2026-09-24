"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
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
} from "@/lib/api-client";
import { UserAccount, Project, InfrastructureStatus, SystemStats } from "@/types";
import { AdminOverview } from "./components/AdminOverview";
import { UserManagement } from "./components/UserManagement";
import { ProjectManagement } from "./components/ProjectManagement";
import { SystemHealth } from "./components/SystemHealth";

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [health, setHealth] = useState<InfrastructureStatus | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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

  if (authLoading || loading) {
    return (
      <AppShell hideHeaderTitle>
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
      <AppShell hideHeaderTitle>
        <div className="max-w-xl mx-auto mt-12 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-[#dc2626] mx-auto mb-4 border border-rose-100">
            <Shield className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 font-heading">
            Administrator Access Required
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-2 leading-relaxed">
            The Administration Control Panel is restricted to Automatic Backend Detection administrator accounts. Your current role is{" "}
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

  return (
    <AppShell hideHeaderTitle>
      <div className="w-full space-y-6 pb-16">
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
        <AdminOverview
          users={users}
          projects={projects}
          health={health}
          stats={stats}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void loadAdminData();
          }}
        />

        {/* 2. System Health */}
        <SystemHealth health={health} stats={stats} />

        {/* 3. User Management */}
        <UserManagement
          users={users}
          currentUserId={user.id}
          onToggleStatus={handleToggleUserStatus}
          onDeleteUser={handleDeleteUser}
        />

        {/* 4. Project Management */}
        <ProjectManagement
          projects={projects}
          cleaning={cleaning}
          onCleanTestData={handleCleanTestData}
          onDeleteProject={handleDeleteProject}
        />
      </div>
    </AppShell>
  );
}
