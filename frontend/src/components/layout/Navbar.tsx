"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Server,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Users,
  BarChart3,
  Settings,
  LogOut,
  User,
  Shield,
  LogIn,
  Bell,
  ChevronDown,
  Menu,
  X,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useNotifications } from "@/context/notification-context";
import { fetchSystemStats } from "@/lib/api-client";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function Navbar() {
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
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadCounts = async () => {
      try {
        const stats = await fetchSystemStats();
        if (!mounted) return;
        setServiceCount(stats.active_services_count);
        setOpenIncidentCount(stats.open_incidents_count);
      } catch (error) {
        // Silently continue
      }
    };

    loadCounts();
    const interval = setInterval(loadCounts, 8000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Close dropdowns on route change
  useEffect(() => {
    setShowUserMenu(false);
    setShowNotifications(false);
    setShowAdminMenu(false);
    setMobileMenuOpen(false);
  }, [pathname]);

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
    {
      name: "Admin Dashboard",
      href: "/admin/dashboard",
      icon: ShieldCheck,
      description: "Cluster health & ML telemetry overview",
    },
    {
      name: "Users & Services",
      href: "/admin/users-services",
      icon: Users,
      description: "Manage accounts & microservice access",
    },
    {
      name: "System Monitoring",
      href: "/admin/monitoring",
      icon: BarChart3,
      description: "Real-time Redis stream & node metrics",
    },
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

  const isAdminActive = pathname?.startsWith("/admin");

  return (
    <>
      <nav className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)]">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between gap-4">
            {/* 1. Left: Brand Logo & Title */}
            <div className="flex items-center gap-6">
              <BrandLogo size="md" href="/dashboard" />

              {/* Desktop Horizontal Navigation Links */}
              <div className="hidden md:flex items-center gap-1.5 ml-2">
                {navLinks.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname?.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                        isActive
                          ? "bg-red-50 text-[#dc2626] font-bold shadow-[0_2px_8px_-2px_rgba(220,38,38,0.15)]"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${
                          isActive
                            ? "text-[#dc2626] stroke-[2.2]"
                            : "text-slate-400 group-hover:text-slate-600"
                        }`}
                      />
                      <span>{item.name}</span>
                      {item.badge && (
                        <span
                          className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                            item.badgeColor ||
                            (isActive
                              ? "bg-red-100 text-red-700"
                              : "bg-slate-100 text-slate-600")
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}

                {/* Admin Dropdown */}
                {isAdmin && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAdminMenu(!showAdminMenu);
                        setShowUserMenu(false);
                        setShowNotifications(false);
                      }}
                      className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                        isAdminActive
                          ? "bg-slate-900 text-white font-bold"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <Shield className={`h-4 w-4 ${isAdminActive ? "text-red-400" : "text-indigo-600"}`} />
                      <span>Admin Console</span>
                      <ChevronDown className="h-3 w-3 opacity-70" />
                    </button>

                    {showAdminMenu && (
                      <div className="absolute left-0 mt-2 w-64 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl z-50 animate-fadeIn font-sans">
                        <div className="px-3 py-1.5 border-b border-slate-100 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-heading">
                            Admin Operations
                          </span>
                        </div>
                        <div className="space-y-1">
                          {adminLinks.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setShowAdminMenu(false)}
                                className={`flex items-start gap-2.5 rounded-xl px-3 py-2 text-xs transition ${
                                  isActive
                                    ? "bg-red-50 text-[#dc2626] font-bold"
                                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                              >
                                <Icon
                                  className={`h-4 w-4 mt-0.5 shrink-0 ${
                                    isActive ? "text-[#dc2626]" : "text-slate-400"
                                  }`}
                                />
                                <div>
                                  <p className="font-semibold font-heading leading-tight">{item.name}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5 font-normal">{item.description}</p>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 2. Right Controls */}
            <div className="flex items-center gap-3">
              {/* Live WebSocket Status Indicator */}
              <div
                className={`hidden lg:flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full font-heading border transition-colors ${
                  isConnected
                    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                    : "text-slate-600 bg-slate-50 border-slate-200"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                  }`}
                />
                <span>{isConnected ? "Real-Time Live" : "Offline"}</span>
              </div>

              {/* Real-time Notification Bell */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setShowUserMenu(false);
                    setShowAdminMenu(false);
                  }}
                  className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 transition shadow-sm cursor-pointer"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#dc2626] text-white text-[9px] font-bold animate-pulse font-heading">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-100 bg-white p-4 shadow-2xl z-50 animate-fadeIn font-sans">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 font-heading">
                          Real-Time Notifications
                        </span>
                        {unreadCount > 0 && (
                          <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-bold font-heading">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={markAllAsRead}
                            className="text-[11px] font-semibold text-[#dc2626] hover:underline cursor-pointer"
                          >
                            Mark all read
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={clearNotifications}
                          title="Clear all notifications"
                          className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
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
                                : "bg-red-50/40 border-red-100 text-slate-900 shadow-xs"
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
                            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2 font-sans">
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
                                  View details <ExternalLink className="h-2.5 w-2.5" />
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


              {/* User Profile / Guest Sign In */}
              <div className="relative">
                {user ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(!showUserMenu);
                      setShowNotifications(false);
                      setShowAdminMenu(false);
                    }}
                    className="flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:border-slate-300 transition shadow-sm cursor-pointer font-heading"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-700 font-bold text-[10px]">
                      {userInitials}
                    </div>
                    <span className="hidden sm:inline font-bold">{userDisplayName}</span>
                    <ChevronDown className="h-3 w-3 text-slate-400" />
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="flex items-center gap-2 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white px-4 py-2 text-xs font-bold font-heading shadow-sm transition"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Sign In / Register</span>
                  </Link>
                )}

                {showUserMenu && user && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-100 bg-white p-2.5 shadow-2xl z-50 animate-fadeIn font-sans">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <p className="font-bold text-xs text-slate-900 font-heading">{user.name}</p>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{user.email}</p>
                      <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {user.role}
                      </span>
                    </div>

                    <div className="space-y-0.5 text-xs">
                      {isAdmin && (
                        <Link
                          href="/admin/dashboard"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50 transition font-medium"
                        >
                          <Shield className="h-3.5 w-3.5 text-indigo-600" />
                          <span>Admin Console</span>
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

              {/* Mobile Menu Toggle */}
              <div className="flex md:hidden">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition shadow-sm"
                  aria-label="Toggle Navigation Menu"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-2 animate-fadeIn font-sans">
            <div className="space-y-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname?.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                      isActive
                        ? "bg-red-50 text-[#dc2626]"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${isActive ? "text-[#dc2626]" : "text-slate-400"}`} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-bold">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {isAdmin && (
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-3 mb-1 font-heading">
                  Admin Console
                </span>
                {adminLinks.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                        isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="h-4 w-4 text-slate-400" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>

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
              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;
