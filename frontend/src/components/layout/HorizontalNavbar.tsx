"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  LayoutDashboard,
  Server,
  Activity,
  AlertTriangle,
  Bell,
  ChevronDown,
  User,
  Settings,
  Shield,
  LogOut,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useNotifications } from "@/context/notification-context";
import { fetchSystemStats } from "@/lib/api-client";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function HorizontalNavbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const {
    notifications,
    unreadCount,
    isConnected,
    latestToast,
    dismissToast,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useNotifications();

  const [serviceCount, setServiceCount] = useState<number | null>(null);
  const [openIncidentCount, setOpenIncidentCount] = useState<number | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [activeInterval, setActiveInterval] = useState("5m");

  useEffect(() => {
    let mounted = true;

    const loadStats = async () => {
      try {
        const stats = await fetchSystemStats();
        if (!mounted) return;
        setServiceCount(stats.active_services_count);
        setOpenIncidentCount(stats.open_incidents_count);
      } catch (err) {
        // Fallback silently
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 8000);
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
      name: "Services",
      href: "/services",
      icon: Server,
      badge: serviceCount !== null ? String(serviceCount) : null,
    },
    {
      name: "Live Telemetry",
      href: "/telemetry",
      icon: Activity,
      badge: null,
    },
    {
      name: "Incidents",
      href: "/incidents",
      icon: AlertTriangle,
      badge: openIncidentCount !== null && openIncidentCount > 0 ? String(openIncidentCount) : null,
      badgeColor: "bg-rose-100 text-rose-700",
    },
  ];

  const adminLinks = [
    { name: "Admin Dashboard", href: "/admin/dashboard" },
    { name: "Users & Services", href: "/admin/users-services" },
    { name: "System Monitoring", href: "/admin/monitoring" },
  ];

  const isAdmin = user?.role === "Admin";
  const userDisplayName = user?.name ? user.name.split(" ")[0] : "Guest";
  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : "U";

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)]">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* 1. Left: Brand Logo & Title */}
          <div className="flex items-center gap-6 shrink-0">
            <BrandLogo size="md" href="/dashboard" />

            {/* Live WebSocket Connection Pill */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 text-[11px] font-bold font-heading">
              <span
                className={`h-2 w-2 rounded-full ${
                  isConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                }`}
              />
              <span className={isConnected ? "text-emerald-700" : "text-rose-700"}>
                {isConnected ? "Live Socket" : "Offline"}
              </span>
            </div>
          </div>

          {/* 2. Middle: Horizontal Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                    isActive
                      ? "bg-red-50 text-[#dc2626] font-bold border border-red-100/70 shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      isActive ? "text-[#dc2626] stroke-[2.2]" : "text-slate-400"
                    }`}
                  />
                  <span>{item.name}</span>
                  {item.badge && (
                    <span
                      className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${
                        item.badgeColor ||
                        (isActive ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600")
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Admin Menu Dropdown */}
            {isAdmin && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminMenu(!showAdminMenu);
                    setShowNotifications(false);
                    setShowUserMenu(false);
                  }}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                    pathname?.startsWith("/admin")
                      ? "bg-slate-900 text-white font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  <span>Admin Console</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </button>

                {showAdminMenu && (
                  <div className="absolute left-0 mt-2 w-48 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl z-50 animate-fadeIn font-sans">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-3 py-1 font-heading">
                      Admin Controls
                    </span>
                    {adminLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setShowAdminMenu(false)}
                        className={`block rounded-xl px-3 py-2 text-xs transition ${
                          pathname === item.href
                            ? "bg-red-50 text-[#dc2626] font-bold"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* 3. Right: Notifications, Interval, and User/Guest Profile */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Real-time Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowUserMenu(false);
                  setShowAdminMenu(false);
                }}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 transition shadow-xs cursor-pointer"
                aria-label="Real-time Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#dc2626] text-white text-[9px] font-bold animate-pulse font-heading">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-100 bg-white p-4 shadow-2xl z-50 animate-fadeIn font-sans">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-sm text-slate-900">
                        Live Notifications
                      </span>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-red-50 text-red-700 px-2 py-0.5 text-[10px] font-bold font-heading">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllAsRead}
                          className="text-[11px] font-semibold text-[#dc2626] hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={clearNotifications}
                        title="Clear all"
                        className="text-slate-400 hover:text-slate-600 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => markAsRead(notif.id)}
                          className={`p-3 rounded-xl border transition cursor-pointer ${
                            notif.read
                              ? "bg-slate-50/60 border-slate-100 text-slate-600"
                              : "bg-red-50/30 border-red-100/80 text-slate-900 shadow-xs"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {notif.type === "critical" ? (
                                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                              ) : notif.type === "success" ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                              ) : (
                                <Activity className="h-4 w-4 text-blue-600 shrink-0" />
                              )}
                              <span className="text-xs font-bold font-heading line-clamp-1">
                                {notif.title}
                              </span>
                            </div>
                            {!notif.read && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[#dc2626] shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                            {notif.message}
                          </p>
                          <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/60 text-[10px] text-slate-400">
                            <span>{new Date(notif.timestamp).toLocaleTimeString()}</span>
                            {notif.link && (
                              <Link
                                href={notif.link}
                                onClick={() => setShowNotifications(false)}
                                className="text-[#dc2626] font-bold hover:underline inline-flex items-center gap-1 font-heading"
                              >
                                View <ExternalLink className="h-2.5 w-2.5" />
                              </Link>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-xs text-slate-400">
                        No notifications to display.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Time Interval Selector (5m, 15m, 1h) */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-50 border border-slate-200/80 p-1 rounded-xl">
              {["5m", "15m", "1h"].map((range) => {
                const isSelected = activeInterval === range;
                return (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setActiveInterval(range)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition font-heading cursor-pointer ${
                      isSelected
                        ? "bg-white text-[#dc2626] shadow-xs border border-slate-100"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {range}
                  </button>
                );
              })}
            </div>

            {/* User Profile / Sign In Pill */}
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(!showUserMenu);
                    setShowNotifications(false);
                    setShowAdminMenu(false);
                  }}
                  className="flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:border-slate-300 transition shadow-xs cursor-pointer font-heading"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-700 font-bold text-[11px]">
                    {userInitials}
                  </div>
                  <span className="hidden md:inline font-bold">{userDisplayName}</span>
                  <span className="hidden lg:inline text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                    {user.role}
                  </span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-100 bg-white p-2.5 shadow-2xl z-50 animate-fadeIn font-sans">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <p className="font-bold text-xs text-slate-900 font-heading">{user.name}</p>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{user.email}</p>
                    </div>

                    <div className="space-y-0.5 text-xs">
                      {isAdmin && (
                        <Link
                          href="/admin/dashboard"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50 transition font-medium"
                        >
                          <Shield className="h-3.5 w-3.5 text-indigo-600" />
                          <span>Admin Control Center</span>
                        </Link>
                      )}
                      <Link
                        href="/settings"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50 transition font-medium"
                      >
                        <Settings className="h-3.5 w-3.5 text-slate-500" />
                        <span>Settings & Profile</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-red-600 hover:bg-red-50 transition font-medium cursor-pointer"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white px-4 py-2 text-xs font-bold font-heading shadow-sm transition"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign In / Register</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Live Toast Notification Popup */}
      {latestToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 animate-scaleUp font-sans">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              {latestToast.type === "critical" ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 shrink-0 border border-rose-100">
                  <AlertCircle className="h-4 w-4" />
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shrink-0 border border-emerald-100">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              )}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-heading block">
                  Real-Time Alert
                </span>
                <h4 className="text-xs font-bold text-slate-900 font-heading leading-tight mt-0.5">
                  {latestToast.title}
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug line-clamp-2">
                  {latestToast.message}
                </p>
                {latestToast.link && (
                  <Link
                    href={latestToast.link}
                    onClick={dismissToast}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#dc2626] hover:underline mt-2 font-heading"
                  >
                    Open Incident <ExternalLink className="h-2.5 w-2.5" />
                  </Link>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={dismissToast}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
