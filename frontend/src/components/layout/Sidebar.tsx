"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Cpu,
  LayoutDashboard,
  LogOut,
  Radio,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";

const userLinks = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    badge: null,
  },
  {
    name: "Services",
    href: "/services",
    icon: Server,
    badge: "5",
  },
  {
    name: "Live Telemetry",
    href: "/telemetry",
    icon: Radio,
    badge: "Live",
  },
  {
    name: "Incidents",
    href: "/incidents",
    icon: ShieldAlert,
    badge: "2 Open",
    badgeTone: "rose",
  },
];

const adminLinks = [
  {
    name: "Admin Dashboard",
    href: "/admin/dashboard",
    icon: ShieldCheck,
    badge: null,
  },
  {
    name: "Users & Services",
    href: "/admin/users-services",
    icon: Users,
    badge: null,
  },
  {
    name: "System Monitoring",
    href: "/admin/monitoring",
    icon: BarChart3,
    badge: "Cluster",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isAdmin = user?.role === "Admin";
  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : "SR";

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-800/80 bg-slate-950/95 backdrop-blur-2xl">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-800/80 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-md shadow-blue-500/20">
          <Sparkles className="h-5 w-5 text-cyan-200" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold tracking-tight text-white">AuraTrace</span>
            <span
              className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider ${
                isAdmin ? "bg-indigo-500/20 text-indigo-300" : "bg-blue-500/10 text-cyan-400"
              }`}
            >
              {isAdmin ? "Admin" : "Dev"}
            </span>
          </div>
          <p className="text-[10px] font-medium text-slate-500">Autonomous Observability</p>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* User / Developer Workspace */}
        <div>
          <div className="px-3 pb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {isAdmin ? "Developer Views" : "Workspace Navigation"}
            </span>
          </div>
          <nav className="space-y-1">
            {userLinks.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-4 w-4 ${
                        isActive
                          ? "text-white"
                          : "text-slate-400 group-hover:text-cyan-400"
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : item.badgeTone === "rose"
                          ? "bg-rose-500/15 text-rose-300"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Administration (ONLY visible to Admin role) */}
        {isAdmin && (
          <div>
            <div className="px-3 pb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3" />
                Administration Controls
              </span>
            </div>
            <nav className="space-y-1">
              {adminLinks.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname?.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                        : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`h-4 w-4 ${
                          isActive
                            ? "text-white"
                            : "text-slate-400 group-hover:text-indigo-400"
                        }`}
                      />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                          isActive ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Logged in User Profile Footer */}
      <div className="border-t border-slate-800/80 p-3">
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg font-bold text-xs shrink-0 ${
                  isAdmin
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "bg-blue-500/10 text-cyan-400"
                }`}
              >
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-200">
                  {user?.name || "Sunil Rajput"}
                </p>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isAdmin ? "bg-indigo-400" : "bg-cyan-400"
                    }`}
                  />
                  <p className="truncate text-[10px] font-medium text-slate-400">
                    {user?.role || "Developer"}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              title="Sign Out"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
export default Sidebar;
