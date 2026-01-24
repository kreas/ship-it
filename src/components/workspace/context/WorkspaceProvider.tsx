"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  getUserWorkspaces,
  getWorkspaceMembers,
} from "@/lib/actions/workspace";
import type {
  Workspace,
  WorkspaceMemberWithUser,
  WorkspaceRole,
} from "@/lib/types";

interface WorkspaceContextValue {
  // Current workspace
  workspace: Workspace | null;
  workspaceId: string | null;

  // All user workspaces
  workspaces: Workspace[];
  isLoadingWorkspaces: boolean;
  refreshWorkspaces: () => Promise<void>;

  // Current workspace members
  members: WorkspaceMemberWithUser[];
  isLoadingMembers: boolean;
  refreshMembers: () => Promise<void>;

  // Current user's role in workspace
  userRole: WorkspaceRole | null;
  isAdmin: boolean;
  isMember: boolean;
  isViewer: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspaceContext() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error(
      "useWorkspaceContext must be used within a WorkspaceProvider"
    );
  }
  return context;
}

// Optional hook that doesn't throw if not in context
export function useOptionalWorkspaceContext() {
  return useContext(WorkspaceContext);
}

interface WorkspaceProviderProps {
  workspace: Workspace;
  userId: string;
  children: ReactNode;
}

export function WorkspaceProvider({
  workspace,
  userId,
  children,
}: WorkspaceProviderProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([workspace]);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(true);

  const [members, setMembers] = useState<WorkspaceMemberWithUser[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);

  // Fetch all user workspaces
  const refreshWorkspaces = useCallback(async () => {
    setIsLoadingWorkspaces(true);
    try {
      const userWorkspaces = await getUserWorkspaces();
      setWorkspaces(userWorkspaces);
    } catch (error) {
      console.error("Failed to fetch workspaces:", error);
    } finally {
      setIsLoadingWorkspaces(false);
    }
  }, []);

  // Fetch workspace members
  const refreshMembers = useCallback(async () => {
    setIsLoadingMembers(true);
    try {
      const workspaceMembers = await getWorkspaceMembers(workspace.id);
      setMembers(workspaceMembers);
    } catch (error) {
      console.error("Failed to fetch members:", error);
    } finally {
      setIsLoadingMembers(false);
    }
  }, [workspace.id]);

  // Initial fetch
  useEffect(() => {
    refreshWorkspaces();
    refreshMembers();
  }, [refreshWorkspaces, refreshMembers]);

  // Get current user's role
  const currentMember = members.find((m) => m.userId === userId);
  const userRole = (currentMember?.role as WorkspaceRole) ?? null;

  const value: WorkspaceContextValue = {
    workspace,
    workspaceId: workspace.id,
    workspaces,
    isLoadingWorkspaces,
    refreshWorkspaces,
    members,
    isLoadingMembers,
    refreshMembers,
    userRole,
    isAdmin: userRole === "admin",
    isMember: userRole === "member" || userRole === "admin",
    isViewer: userRole === "viewer",
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
