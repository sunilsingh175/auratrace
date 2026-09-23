"use client";

import React, { useState } from "react";
import { FolderKanban, Trash2, AlertTriangle } from "lucide-react";
import { Project } from "@/types";

interface ProjectManagementProps {
  projects: Project[];
  cleaning: boolean;
  onCleanTestData: () => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
}

export function ProjectManagement({
  projects,
  cleaning,
  onCleanTestData,
  onDeleteProject,
}: ProjectManagementProps) {
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    if (!deletingProjectId) return;
    await onDeleteProject(deletingProjectId);
    setDeletingProjectId(null);
  };

  return (
    <>
      <div className="panel p-6 bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-heading">
              Project Management &amp; Cleanup
            </h3>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Cascade delete old test projects and associated operational telemetry
            </p>
          </div>
          <button
            type="button"
            onClick={onCleanTestData}
            disabled={cleaning}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-[#dc2626] hover:bg-rose-100 transition font-heading disabled:opacity-50 cursor-pointer self-start sm:self-auto"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{cleaning ? "Cleaning..." : "Purge Test Workspaces"}</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-heading">
                <th className="pb-3 pl-2">Project Name</th>
                <th className="pb-3">Project ID</th>
                <th className="pb-3">Services / Apps</th>
                <th className="pb-3">Created</th>
                <th className="pb-3 text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-3.5 pl-2">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="font-bold text-slate-900 font-heading">{p.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 text-slate-400 font-mono text-[11px]">
                    {p.id.substring(0, 18)}...
                  </td>
                  <td className="py-3.5 text-slate-600 font-medium">
                    {p.service_count} connected
                  </td>
                  <td className="py-3.5 text-slate-500">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 text-right pr-2">
                    <button
                      type="button"
                      onClick={() => setDeletingProjectId(p.id)}
                      className="inline-flex items-center gap-1 text-slate-400 hover:text-red-600 hover:bg-red-50 px-2.5 py-1 rounded-lg transition font-semibold text-xs cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal: Delete Project */}
      {deletingProjectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 font-heading">
                  Delete Project and Cascade Data?
                </h4>
                <p className="text-xs text-slate-500 font-sans">
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 font-sans leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              Deleting this project will cascade through the database and permanently purge all associated telemetry logs, registered services, and incident records.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingProjectId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 font-heading"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDelete()}
                className="rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white px-4 py-2 text-xs font-bold font-heading shadow-sm transition cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
