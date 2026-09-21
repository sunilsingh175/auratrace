"use client";

import React from "react";
import Link from "next/link";
import { Shield } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function AuthHeader() {
  return (
    <header className="w-full px-6 py-6 md:px-12 flex items-center justify-between">
      <BrandLogo size="md" href="/login" />

      <Link
        href="/security"
        className="flex items-center gap-2 text-xs md:text-sm text-slate-500 hover:text-slate-900 transition-colors group"
      >
        <span className="hidden sm:inline font-medium">Protected by hardware enclave</span>
        <Shield className="w-4 h-4 text-[#dc2626] group-hover:scale-110 transition-transform stroke-[2]" />
      </Link>
    </header>
  );
}
