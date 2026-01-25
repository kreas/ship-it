export const queryKeys = {
  workspace: {
    all: ["workspaces"] as const,
    detail: (id: string) => [...queryKeys.workspace.all, id] as const,
    members: (id: string) =>
      [...queryKeys.workspace.all, id, "members"] as const,
  },
  board: {
    all: ["board"] as const,
    detail: (workspaceId: string) =>
      [...queryKeys.board.all, workspaceId] as const,
  },
  issue: {
    all: ["issues"] as const,
    comments: (issueId: string) =>
      [...queryKeys.issue.all, issueId, "comments"] as const,
    activities: (issueId: string) =>
      [...queryKeys.issue.all, issueId, "activities"] as const,
    chat: (issueId: string) =>
      [...queryKeys.issue.all, issueId, "chat"] as const,
  },
  settings: {
    labels: (workspaceId: string) =>
      ["settings", "labels", workspaceId] as const,
    columns: (workspaceId: string) =>
      ["settings", "columns", workspaceId] as const,
  },
} as const;
