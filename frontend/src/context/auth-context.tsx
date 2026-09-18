"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserAccount } from "@/types";

interface AuthContextType {
  user: UserAccount | null;
  isLoading: boolean;
  login: (credentials: { email?: string; password?: string; role?: "Developer" | "Admin"; apiKey?: string }) => Promise<{ success: boolean; error?: string; role?: "Developer" | "Admin" }>;
  loginWithGoogle: (options?: { role?: "Developer" | "Admin"; email?: string; name?: string; avatarUrl?: string }) => Promise<{ success: boolean; role: "Developer" | "Admin" }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const STORAGE_KEY_USER_SESSION = "auratrace_auth_session_v2";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const sessionUser = sessionStorage.getItem(STORAGE_KEY_USER_SESSION);
      if (sessionUser) setUser(JSON.parse(sessionUser));
    } catch {
      sessionStorage.removeItem(STORAGE_KEY_USER_SESSION);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const persistUser = (account: UserAccount) => {
    setUser(account);
    sessionStorage.setItem(STORAGE_KEY_USER_SESSION, JSON.stringify(account));
  };

  const login = async ({ email, role, apiKey }: { email?: string; password?: string; role?: "Developer" | "Admin"; apiKey?: string }) => {
    if (apiKey) {
      if (apiKey.trim().length < 8) return { success: false, error: "Invalid API key format. Expected at_live_..." };
      const account: UserAccount = { id: "usr-apikey-admin", name: "Master API Key", email: "admin@auratrace.internal", role: "Admin", status: "Active", created_at: new Date().toISOString().split("T")[0] };
      persistUser(account);
      return { success: true, role: "Admin" as const };
    }
    if (!email) return { success: false, error: "Please enter your email address." };
    const cleanEmail = email.trim().toLowerCase();
    const assignedRole = role || (cleanEmail.includes("admin") ? "Admin" : "Developer");
    const namePart = cleanEmail.split("@")[0].replace(/[._-]/g, " ");
    const formattedName = namePart.replace(/\b\w/g, (char) => char.toUpperCase());
    const account: UserAccount = { id: "session-" + cleanEmail, name: formattedName || "Engineer", email: cleanEmail, role: assignedRole, status: "Active", created_at: new Date().toISOString().split("T")[0] };
    persistUser(account);
    return { success: true, role: assignedRole };
  };

  const loginWithGoogle = async (options?: { role?: "Developer" | "Admin"; email?: string; name?: string; avatarUrl?: string }) => {
    const selectedRole = options?.role || "Developer";
    const email = options?.email || "user@auratrace.local";
    const account: UserAccount = { id: "google-" + email.toLowerCase(), name: options?.name || "AuraTrace User", email: email.toLowerCase(), role: selectedRole, status: "Active", created_at: new Date().toISOString().split("T")[0], avatar_url: options?.avatarUrl };
    persistUser(account);
    return { success: true, role: selectedRole };
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem(STORAGE_KEY_USER_SESSION);
    router.push("/login");
  };

  return <AuthContext.Provider value={{ user, isLoading, login, loginWithGoogle, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
