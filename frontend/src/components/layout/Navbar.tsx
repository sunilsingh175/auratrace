"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  BookOpen,
  FolderGit2,
  Github,
  Terminal,
  Menu,
  X,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    {
      name: "Overview",
      href: "/",
      icon: Sparkles,
    },
    {
      name: "Project",
      href: "/project",
      icon: FolderGit2,
    },
    {
      name: "Documentation",
      href: "/docs",
      icon: BookOpen,
    },
  ];

  return (
    <>
      <nav className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between gap-4">
            {/* 1. Brand Logo */}
            <div className="flex items-center gap-8">
              <BrandLogo size="md" href="/" />

              {/* Desktop Navigation Links */}
              <div className="hidden md:flex items-center gap-1.5">
                {navLinks.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname?.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
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
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* 2. Right Actions: GitHub & Get SDK */}
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/sunilsingh175/auratrace"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-xs"
              >
                <Github className="h-4 w-4 text-slate-700" />
                <span>GitHub</span>
              </a>

              <Link
                href="/docs"
                className="inline-flex items-center gap-2 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] active:bg-[#991b1b] text-white px-4 py-2 text-xs font-bold font-heading shadow-sm transition group"
              >
                <Terminal className="h-3.5 w-3.5" />
                <span>Install SDK</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>

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
                  item.href === "/"
                    ? pathname === "/"
                    : pathname?.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                      isActive
                        ? "bg-red-50 text-[#dc2626] font-bold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${isActive ? "text-[#dc2626]" : "text-slate-400"}`} />
                      <span>{item.name}</span>
                    </div>
                  </Link>
                );
              })}

              <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                <a
                  href="https://github.com/sunilsingh175/auratrace"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700"
                >
                  <Github className="h-4 w-4" />
                  <span>View on GitHub</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}

export default Navbar;
