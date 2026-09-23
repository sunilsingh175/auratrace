"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  AlertTriangle,
  LogOut,
  LogIn,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { fetchSystemStats } from "@/lib/api-client";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [openIncidentCount, setOpenIncidentCount] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadCounts = async () => {
      try {
        const stats = await fetchSystemStats();
        if (!mounted) return;
        setOpenIncidentCount(stats.open_incidents_count);
      } catch (error) {
        // Fallback gracefully without throwing
      }
    };

    loadCounts();
    const interval = setInterval(loadCounts, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const navLinks = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      name: "Crashes",
      href: "/incidents",
      icon: AlertTriangle,
      badge: openIncidentCount !== null && openIncidentCount > 0 ? String(openIncidentCount) : null,
    },
    {
      name: "Projects & Setup",
      href: "/projects",
      icon: FolderKanban,
      badge: null,
    },
  ];

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : "U";

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-100 bg-white">
      {/* Brand Header */}
      <div className="flex h-20 items-center px-6 border-b border-slate-50">
        <BrandLogo size="md" href="/dashboard" />
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-4 mb-2 font-heading">
            Workspace Navigation
          </span>
          <nav className="space-y-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                    isActive
                      ? "bg-red-50 text-[#dc2626]"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-4 w-4 ${
                        isActive ? "text-[#dc2626] stroke-[2.2]" : "text-slate-400 group-hover:text-slate-600"
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isActive
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-600"
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
      </div>

      {/* Footer / Account Information */}
      <div className="border-t border-slate-100 p-4">
        {user ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-700 font-bold text-xs shrink-0 font-heading">
                {userInitials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-900 font-heading">
                  {user.name}
                </p>
                <p className="truncate text-[10px] text-slate-500 font-medium">
                  {user.role}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 rounded-xl bg-[#dc2626] text-white py-2.5 px-4 text-xs font-bold font-heading hover:bg-[#b91c1c] transition w-full shadow-sm"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign In / Register</span>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
