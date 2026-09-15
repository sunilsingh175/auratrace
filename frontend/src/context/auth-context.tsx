"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserAccount } from "@/types";
import { MOCK_USERS } from "@/lib/mockData";

interface AuthContextType {
  user: UserAccount | null;
  users: UserAccount[];
  isLoading: boolean;
  login: (credentials: {
    email?: string;
    password?: string;
    role?: "Developer" | "Admin";
    apiKey?: string;
  }) => Promise<{ success: boolean; error?: string; role?: "Developer" | "Admin" }>;
  loginWithGoogle: (options?: {
    role?: "Developer" | "Admin";
    email?: string;
    name?: string;
    avatarUrl?: string;
  }) => Promise<{ success: boolean; role: "Developer" | "Admin" }>;
  logout: () => void;
  addUser: (newUser: Omit<UserAccount, "id" | "created_at">) => UserAccount;
  deleteUser: (id: string) => void;
  toggleUserStatus: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_USER_SESSION = "auratrace_auth_session_v2";
const STORAGE_KEY_USERS_LIST = "auratrace_users_list_v2";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserAccount | null>(null);
  const [users, setUsers] = useState<UserAccount[]>(MOCK_USERS);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize on mount - Purge any old legacy auto-login keys
  useEffect(() => {
    try {
      // Clean up legacy keys that auto-logged in as Admin
      localStorage.removeItem("auratrace_active_user");
      localStorage.removeItem("auratrace_users_list");
      localStorage.removeItem("auratrace_user");

      const sessionUser = sessionStorage.getItem(STORAGE_KEY_USER_SESSION);
      if (sessionUser) {
        try {
          setUser(JSON.parse(sessionUser));
        } catch {
          setUser(null);
          sessionStorage.removeItem(STORAGE_KEY_USER_SESSION);
        }
      } else {
        // Default to unauthenticated guest mode
        setUser(null);
      }
    } catch (e) {
      console.warn("Failed to initialize auth state:", e);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async ({
    email,
    password,
    role,
    apiKey,
  }: {
    email?: string;
    password?: string;
    role?: "Developer" | "Admin";
    apiKey?: string;
  }): Promise<{ success: boolean; error?: string; role?: "Developer" | "Admin" }> => {
    // 1. API Key Auth
    if (apiKey) {
      if (apiKey.trim().length < 8) {
        return { success: false, error: "Invalid API key format. Expected at_live_..." };
      }
      const adminUser: UserAccount = {
        id: "usr-apikey-admin",
        name: "Master API Key (Cluster Admin)",
        email: "admin@auratrace.internal",
        role: "Admin",
        status: "Active",
        created_at: new Date().toISOString().split("T")[0],
      };
      setUser(adminUser);
      sessionStorage.setItem(STORAGE_KEY_USER_SESSION, JSON.stringify(adminUser));
      return { success: true, role: "Admin" };
    }

    // 2. Email / Password credentials
    if (!email) {
      return { success: false, error: "Please enter your email address." };
    }

    const cleanEmail = email.trim().toLowerCase();
    let matchedUser = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (matchedUser) {
      if (matchedUser.status === "Suspended") {
        return { success: false, error: "This user account has been suspended by an Admin." };
      }
      setUser(matchedUser);
      sessionStorage.setItem(STORAGE_KEY_USER_SESSION, JSON.stringify(matchedUser));
      return { success: true, role: matchedUser.role === "Admin" ? "Admin" : "Developer" };
    }

    // Auto-create or synthesize session with selected role
    const assignedRole = role || (cleanEmail.includes("admin") ? "Admin" : "Developer");
    const namePart = email.split("@")[0].replace(/[._]/g, " ");
    const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);

    const newUserObj: UserAccount = {
      id: `usr-${Math.random().toString(36).substring(2, 7)}`,
      name: formattedName || "Engineer",
      email: cleanEmail,
      role: assignedRole,
      status: "Active",
      created_at: new Date().toISOString().split("T")[0],
    };

    const updatedList = [newUserObj, ...users];
    setUsers(updatedList);
    setUser(newUserObj);
    sessionStorage.setItem(STORAGE_KEY_USERS_LIST, JSON.stringify(updatedList));
    sessionStorage.setItem(STORAGE_KEY_USER_SESSION, JSON.stringify(newUserObj));

    return { success: true, role: assignedRole };
  };

  const loginWithGoogle = async (options?: {
    role?: "Developer" | "Admin";
    email?: string;
    name?: string;
    avatarUrl?: string;
  }): Promise<{ success: boolean; role: "Developer" | "Admin" }> => {
    const selectedRole = options?.role || "Developer";
    const googleEmail = options?.email || (selectedRole === "Admin" ? "admin.sunil@gmail.com" : "sunil.singh.rajput@gmail.com");
    const googleName = options?.name || (selectedRole === "Admin" ? "Sunil Singh (Google Admin)" : "Sunil Singh");
    const googleAvatar = options?.avatarUrl || "https://lh3.googleusercontent.com/a/default-user=s96-c";

    let matchedUser = users.find((u) => u.email.toLowerCase() === googleEmail.toLowerCase());

    if (matchedUser) {
      matchedUser = {
        ...matchedUser,
        avatar_url: googleAvatar,
        role: selectedRole,
      };
      setUser(matchedUser);
      sessionStorage.setItem(STORAGE_KEY_USER_SESSION, JSON.stringify(matchedUser));
      return { success: true, role: selectedRole };
    }

    const newGoogleUser: UserAccount = {
      id: `usr-g-${Math.random().toString(36).substring(2, 7)}`,
      name: googleName,
      email: googleEmail,
      role: selectedRole,
      status: "Active",
      created_at: new Date().toISOString().split("T")[0],
      avatar_url: googleAvatar,
    };

    const updatedList = [newGoogleUser, ...users];
    setUsers(updatedList);
    setUser(newGoogleUser);
    sessionStorage.setItem(STORAGE_KEY_USERS_LIST, JSON.stringify(updatedList));
    sessionStorage.setItem(STORAGE_KEY_USER_SESSION, JSON.stringify(newGoogleUser));

    return { success: true, role: selectedRole };
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem(STORAGE_KEY_USER_SESSION);
    localStorage.removeItem("auratrace_active_user");
    localStorage.removeItem("auratrace_users_list");
    router.push("/login");
  };

  const addUser = (newUser: Omit<UserAccount, "id" | "created_at">): UserAccount => {
    const created: UserAccount = {
      id: `usr-${Math.random().toString(36).substring(2, 7)}`,
      ...newUser,
      created_at: new Date().toISOString().split("T")[0],
    };
    const updatedList = [created, ...users];
    setUsers(updatedList);
    localStorage.setItem(STORAGE_KEY_USERS_LIST, JSON.stringify(updatedList));
    return created;
  };

  const deleteUser = (id: string) => {
    const updatedList = users.filter((u) => u.id !== id);
    setUsers(updatedList);
    localStorage.setItem(STORAGE_KEY_USERS_LIST, JSON.stringify(updatedList));
    if (user?.id === id) {
      logout();
    }
  };

  const toggleUserStatus = (id: string) => {
    const updatedList = users.map((u) => {
      if (u.id === id) {
        return {
          ...u,
          status: (u.status === "Active" ? "Suspended" : "Active") as "Active" | "Suspended",
        };
      }
      return u;
    });
    setUsers(updatedList);
    localStorage.setItem(STORAGE_KEY_USERS_LIST, JSON.stringify(updatedList));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        isLoading,
        login,
        loginWithGoogle,
        logout,
        addUser,
        deleteUser,
        toggleUserStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
