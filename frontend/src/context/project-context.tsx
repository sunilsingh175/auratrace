"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Project } from "@/types";
import { fetchProjects } from "@/lib/api-client";
import { useAuth } from "./auth-context";

interface ProjectContextType {
  projects: Project[];
  selectedProject: Project | null;
  selectedProjectId: string | null;
  isLoading: boolean;
  selectProject: (projectId: string) => void;
  reloadProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);
const STORAGE_KEY_SELECTED_PROJECT = "auratrace_active_project_id_v1";

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reloadProjects = useCallback(async () => {
    try {
      const data = await fetchProjects();
      setProjects(data);

      if (data.length > 0) {
        const savedId = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_SELECTED_PROJECT) : null;
        const matched = data.find((p) => p.id === savedId);
        if (matched) {
          setSelectedProjectId(matched.id);
        } else {
          setSelectedProjectId(data[0].id);
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY_SELECTED_PROJECT, data[0].id);
          }
        }
      } else {
        setSelectedProjectId(null);
      }
    } catch (err) {
      console.warn("Failed to load projects in ProjectContext:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadProjects();
  }, [user, reloadProjects]);

  const selectProject = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_SELECTED_PROJECT, projectId);
    }
  }, []);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || (projects.length > 0 ? projects[0] : null);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        selectedProject,
        selectedProjectId: selectedProject?.id || null,
        isLoading,
        selectProject,
        reloadProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
