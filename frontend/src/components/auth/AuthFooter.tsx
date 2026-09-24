"use client";

import React from "react";
import Link from "next/link";

export function AuthFooter() {
  return (
    <footer className="w-full py-8 text-center text-xs text-slate-500">
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <span>© 2026 AutoTrace Inc.</span>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-medium">
          <Link
            href="/privacy"
            className="hover:text-slate-900 transition-colors cursor-pointer"
          >
            Privacy Policy
          </Link>
          <span className="text-slate-300 hidden sm:inline">•</span>
          <Link
            href="/terms"
            className="hover:text-slate-900 transition-colors cursor-pointer"
          >
            Terms of Service
          </Link>
          <span className="text-slate-300 hidden sm:inline">•</span>
          <Link
            href="/security"
            className="hover:text-slate-900 transition-colors cursor-pointer"
          >
            Security
          </Link>
          <span className="text-slate-300 hidden sm:inline">•</span>
          <Link
            href="/contact"
            className="hover:text-slate-900 transition-colors cursor-pointer"
          >
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}
