"use client";

import React, { useState } from "react";
import { UserX, UserCheck, Trash2, AlertTriangle } from "lucide-react";
import { UserAccount } from "@/types";

interface UserManagementProps {
  users: UserAccount[];
  currentUserId?: string;
  onToggleStatus: (user: UserAccount) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
}

export function UserManagement({
  users,
  currentUserId,
  onToggleStatus,
  onDeleteUser,
}: UserManagementProps) {
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    if (!deletingUserId) return;
    await onDeleteUser(deletingUserId);
    setDeletingUserId(null);
  };

  return (
    <>
      <div className="panel p-6 bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-heading">
              User Management
            </h3>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Manage developer accounts, roles, and administrative permissions
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400 font-heading">
            {users.length} registered
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-heading">
                <th className="pb-3 pl-2">User</th>
                <th className="pb-3">Email</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isSelf = u.id === currentUserId;
                const isActive = u.status === "Active";

                return (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 pl-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700 font-bold text-[10px] font-heading">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 font-heading block">
                            {u.name}
                          </span>
                          {isSelf && (
                            <span className="text-[10px] font-bold text-[#dc2626] font-heading">
                              (You)
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 text-slate-600 font-mono text-[11px]">
                      {u.email}
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold font-heading ${
                          u.role === "Admin"
                            ? "bg-red-50 text-[#dc2626] border border-red-100"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-heading ${
                          isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isActive ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                        />
                        <span>{u.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 text-right pr-2">
                      <div className="flex items-center justify-end gap-2">
                        {!isSelf ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void onToggleStatus(u)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                isActive
                                  ? "text-amber-700 bg-amber-50 hover:bg-amber-100"
                                  : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                              }`}
                            >
                              {isActive ? (
                                <>
                                  <UserX className="h-3 w-3" />
                                  <span>Suspend</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-3 w-3" />
                                  <span>Reactivate</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeletingUserId(u.id)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                              title="Delete user account"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">
                            Active Session
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal: Delete User */}
      {deletingUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 font-heading">
                  Permanently Delete User Account?
                </h4>
                <p className="text-xs text-slate-500 font-sans">
                  The user will lose all platform access immediately.
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 font-sans leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              Are you sure you want to delete this user account from the system?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUserId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 font-heading"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDelete()}
                className="rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white px-4 py-2 text-xs font-bold font-heading shadow-sm transition cursor-pointer"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
