"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserAccount } from "@/types";

type Role = "Developer" | "Admin";

interface AuthContextType {
  user: UserAccount | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<{ success: boolean; error?: string; otpRequired?: boolean }>;
  register: (credentials: { name: string; email: string; password: string; role: Role; adminRegistrationKey?: string }) => Promise<{ success: boolean; error?: string; otpRequired?: boolean }>;
  verifyOtp: (credentials: { email: string; otp: string; purpose: "login" | "register" }) => Promise<{ success: boolean; error?: string; role?: Role }>;
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
  if (!response.ok) throw new Error(data?.detail || "Authentication request failed.");
  return data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const token = sessionStorage.getItem(STORAGE_KEY_ACCESS_TOKEN);
      const sessionUser = sessionStorage.getItem(STORAGE_KEY_USER_SESSION);

      if (!token || !sessionUser) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/aura?path=auth/me", {
          method: "GET",
          headers: { Authorization: "Bearer " + token },
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data?.user) {
          throw new Error(data?.detail || "Session expired.");
        }

        if (!cancelled) {
          setUser(data.user as UserAccount);
          sessionStorage.setItem(STORAGE_KEY_USER_SESSION, JSON.stringify(data.user));
        }
      } catch {
        sessionStorage.removeItem(STORAGE_KEY_USER_SESSION);
        sessionStorage.removeItem(STORAGE_KEY_ACCESS_TOKEN);
        if (!cancelled) {
          setUser(null);
          router.replace("/login");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    restoreSession();
    return () => { cancelled = true; };
  }, [router]);

  const persistAuth = (data: any) => {
    const account = data.user as UserAccount;
    setUser(account);
    sessionStorage.setItem(STORAGE_KEY_USER_SESSION, JSON.stringify(account));
    if (data.access_token) sessionStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, data.access_token);
  };

  const login = async ({ email, password }: { email: string; password: string }) => {
    try {
      const data = await authRequest("login", { email, password });
      if (data.otp_required) return { success: true, otpRequired: true };
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
      return { success: true, otpRequired: Boolean(data.otp_required) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Registration failed." };
    }
  };

  const verifyOtp = async ({ email, otp, purpose }: { email: string; otp: string; purpose: "login" | "register" }) => {
    try {
      const data = await authRequest("verify-otp", { email, otp, purpose });
      persistAuth(data);
      return { success: true, role: data.user.role as Role };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "OTP verification failed." };
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem(STORAGE_KEY_USER_SESSION);
    sessionStorage.removeItem(STORAGE_KEY_ACCESS_TOKEN);
    router.push("/login");
  };

  return <AuthContext.Provider value={{ user, isLoading, login, register, verifyOtp, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
