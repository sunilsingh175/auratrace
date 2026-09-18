`use client`;

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserAccount } from "@/types";

type Role = "Developer" | "Admin";

interface AuthContextType {
  user: UserAccount | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<{ success: boolean; error?: string; role?: Role }>;
  register: (credentials: { name: string; email: string; password: string; role: Role; adminRegistrationKey?: string }) => Promise<{ success: boolean; error?: string; role?: Role }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const STORAGE_KEY_USER_SESSION = "auratrace_auth_session_v3";
const STORAGE_KEY_ACCESS_TOKEN = "auratrace_access_token_v1";

async function authRequest(path: string, body: unknown) {
  const response = await fetch("/api/aura?path=" + encodeURIComponent("auth/" + path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.detail || "Authentication request failed.");
  }
  return data;
}

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
      sessionStorage.removeItem(STORAGE_KEY_ACCESS_TOKEN);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const persistAuth = (data: any) => {
    const account = data.user as UserAccount;
    setUser(account);
    sessionStorage.setItem(STORAGE_KEY_USER_SESSION, JSON.stringify(account));
    if (data.access_token) {
      sessionStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, data.access_token);
    }
  };

  const login = async ({ email, password }: { email: string; password: string }) => {
    try {
      const data = await authRequest("login", { email, password });
      persistAuth(data);
      return { success: true, role: data.user.role as Role };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Authentication failed." };
    }
  };

  const register = async ({ name, email, password, role, adminRegistrationKey }: { name: string; email: string; password: string; role: Role; adminRegistrationKey?: string }) => {
    try {
      const data = await authRequest("register", {
        name,
        email,
        password,
        role,
        admin_registration_key: adminRegistrationKey || undefined,
      });
      persistAuth(data);
      return { success: true, role: data.user.role as Role };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Registration failed." };
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem(STORAGE_KEY_USER_SESSION);
    sessionStorage.removeItem(STORAGE_KEY_ACCESS_TOKEN);
    router.push("/login");
  };

  return <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
