"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

export function ProtectedRoute({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: "Developer" | "Admin";
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (role && user.role !== role) {
      router.replace(user.role === "Admin" ? "/admin" : "/dashboard");
    }
  }, [isLoading, user, role, router, pathname]);

  if (isLoading || !user || (role && user.role !== role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080c14] text-xs text-slate-500">
        Checking access...
      </div>
    );
  }

  return <>{children}</>;
}
