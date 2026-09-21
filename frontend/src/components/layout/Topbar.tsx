"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  LogOut,
  Settings,
  User,
  Shield,
  LogIn,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";

interface TopbarProps {
  title?: string;
  subtitle?: string;
  selectedTimeRange?: string;
  onTimeRangeChange?: (range: string) => void;
}

export function Topbar({
  title = "Dashboard",
  subtitle = "Real-time overview of your infrastructure and services",
  selectedTimeRange = "5m",
  onTimeRangeChange,
}: TopbarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [activeRange, setActiveRange] = useState(selectedTimeRange);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleRange = (range: string) => {
    setActiveRange(range);
    if (onTimeRangeChange) onTimeRangeChange(range);
  };

  const isAdmin = user?.role === "Admin";
  const userDisplayName = user?.name ? user.name.split(" ")[0] : "Guest";

  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between bg-[#f8fafc]/90 px-8 backdrop-blur-md">
      {/* Page Title & Subtitle */}
      <div>
        {title && (
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-sans">
                {subtitle}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3.5 ml-auto">
        {/* For Guests: Login CTA / For Users: Active Badge */}
        {!user ? (
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:border-slate-300 transition shadow-sm font-heading"
          >
            <LogIn className="h-3.5 w-3.5 text-[#dc2626]" />
            <span>Login</span>
          </Link>
        ) : (
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full font-heading">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{user.role} Active</span>
          </div>
        )}

        {/* Notification Bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 transition shadow-sm cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl z-50 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                <span className="text-xs font-bold text-slate-900 font-heading">
                  System Notifications
                </span>
                <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-bold font-heading">
                  Live
                </span>
              </div>
              <div className="space-y-2 text-xs font-sans">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="font-semibold text-slate-900 font-heading">Isolation Forest Worker</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Telemetry streams active with pgvector similarity indexing.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:border-slate-300 transition shadow-sm cursor-pointer font-heading"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <User className="h-3 w-3" />
            </div>
            <span>{userDisplayName}</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-100 bg-white p-2.5 shadow-xl z-50 animate-fadeIn font-sans">
              {user ? (
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="font-bold text-xs text-slate-900 font-heading">{user.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                </div>
              ) : (
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="font-bold text-xs text-slate-700 font-heading">Guest User</p>
                  <Link href="/login" className="text-[10px] text-[#dc2626] font-semibold hover:underline block mt-0.5">
                    Sign in for full access →
                  </Link>
                </div>
              )}

              <div className="space-y-0.5 text-xs">
                {isAdmin && (
                  <Link
                    href="/admin/dashboard"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50 transition font-medium"
                  >
                    <Shield className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Admin Operations</span>
                  </Link>
                )}
                {user && (
                  <Link
                    href="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50 transition font-medium"
                  >
                    <Settings className="h-3.5 w-3.5 text-slate-500" />
                    <span>Settings & Profile</span>
                  </Link>
                )}
                {user ? (
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
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-red-600 hover:bg-red-50 transition font-semibold"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Sign In</span>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
