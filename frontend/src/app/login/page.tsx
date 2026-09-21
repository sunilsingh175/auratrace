"use client";

import React from "react";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthFooter } from "@/components/auth/AuthFooter";
import { AuthForm } from "@/components/auth/AuthForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-900 flex flex-col justify-between selection:bg-red-500/20 selection:text-red-900">
      <AuthHeader />
      <main className="flex-1 flex items-center justify-center">
        <AuthForm initialTab="login" />
      </main>
      <AuthFooter />
    </div>
  );
}
