"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserAccount, Role } from "@/types";

interface AuthResult {
  success: boolean;
  error?: string;
  otpRequired?: boolean;
  role?: Role;
}

interface AuthContextType {
  user: UserAccount | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<AuthResult>;
  register: (credentials: { name: string; email: string; password: string; role: Role; adminRegistrationKey?: string }) => Promise<AuthResult>;
  verifyOtp: (credentials: { email: string; otp: string; purpose: "login" | "register" | "reset_password" }) => Promise<AuthResult>;
  resendOtp: (credentials: { email: string; purpose: "login" | "register" | "reset_password" }) => Promise<AuthResult>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  resetPassword: (credentials: { email: string; otp: string; newPassword: string }) => Promise<{ success: boolean; error?: string; message?: string }>;
  updateProfile: (name: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);
const STORAGE_KEY_USER_SESSION = "trace_auth_session_v3";
const STORAGE_KEY_ACCESS_TOKEN = "trace_access_token_v1";

async function authRequest(path: string, body: unknown) {
  const response = await fetch("/api/aura?path=" + encodeURIComponent("auth/" + path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    let errorMsg = "Authentication request failed.";
    if (typeof data?.detail === "string") {
      errorMsg = data.detail;
    } else if (Array.isArray(data?.detail)) {
      errorMsg = data.detail
        .map((item: any) => (item?.msg ? `${item.msg}${item?.loc ? ` (${item.loc.slice(1).join(".")})` : ""}` : JSON.stringify(item)))
        .join("; ");
    } else if (data?.detail && typeof data.detail === "object") {
      errorMsg = data.detail.msg || JSON.stringify(data.detail);
    } else if (typeof data?.error === "string") {
      errorMsg = data.error;
    } else if (typeof data?.message === "string") {
      errorMsg = data.message;
    }
    throw new Error(errorMsg);
  }
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

  const login = async ({ email, password }: { email: string; password: string }): Promise<AuthResult> => {
    try {
      const data = await authRequest("login", { email, password });
      if (data.otp_required) return { success: true, otpRequired: true };
      persistAuth(data);
      return { success: true, role: data.user.role as Role };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Authentication failed." };
    }
  };

  const register = async ({ name, email, password, role, adminRegistrationKey }: { name: string; email: string; password: string; role: Role; adminRegistrationKey?: string }): Promise<AuthResult> => {
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

  const verifyOtp = async ({ email, otp, purpose }: { email: string; otp: string; purpose: "login" | "register" | "reset_password" }): Promise<AuthResult> => {
    try {
      const data = await authRequest("verify-otp", { email, otp, purpose });
      persistAuth(data);
      return { success: true, role: data.user.role as Role };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "OTP verification failed." };
    }
  };

  const resendOtp = async ({ email, purpose }: { email: string; purpose: "login" | "register" | "reset_password" }): Promise<AuthResult> => {
    try {
      await authRequest("resend-otp", { email, purpose });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to resend verification code." };
    }
  };

  const forgotPassword = async (email: string): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const data = await authRequest("forgot-password", { email });
      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to initiate password reset." };
    }
  };

  const resetPassword = async ({ email, otp, newPassword }: { email: string; otp: string; newPassword: string }): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const data = await authRequest("reset-password", { email, otp, new_password: newPassword });
      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to reset password." };
    }
  };

  const updateProfile = async (name: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const token = sessionStorage.getItem(STORAGE_KEY_ACCESS_TOKEN);
      const res = await fetch("/api/aura?path=" + encodeURIComponent("auth/profile"), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: "Bearer " + token } : {}),
        },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.detail || data?.error || "Failed to update profile.");
      }
      if (data?.user) {
        setUser(data.user as UserAccount);
        sessionStorage.setItem(STORAGE_KEY_USER_SESSION, JSON.stringify(data.user));
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to update profile." };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const token = sessionStorage.getItem(STORAGE_KEY_ACCESS_TOKEN);
      const res = await fetch("/api/aura?path=" + encodeURIComponent("auth/change-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: "Bearer " + token } : {}),
        },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.detail || data?.error || "Failed to change password.");
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to change password." };
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem(STORAGE_KEY_USER_SESSION);
    sessionStorage.removeItem(STORAGE_KEY_ACCESS_TOKEN);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        verifyOtp,
        resendOtp,
        forgotPassword,
        resetPassword,
        updateProfile,
        changePassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
