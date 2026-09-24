"use client";

import React from "react";
import Link from "next/link";

export function AuthFooter() {
  return (
    <footer className="w-full py-8 text-center text-xs text-slate-500">
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <span>© 2026 AutoTrace Inc.</span>
        <div className="flex items-center gap-6">
          <Link
            href="/privacy"
            className="hover:text-slate-900 transition-colors cursor-pointer"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="hover:text-slate-900 transition-colors cursor-pointer"
          >
            Terms
          </Link>
          <Link
            href="/security"
            className="hover:text-slate-900 transition-colors cursor-pointer"
          >
            Security
          </Link>
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
