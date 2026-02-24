import { type UIMessage } from "ai";
import {
  createChatResponse,
  createIssueTools,
  createMemoryTools,
  loadSkillsForPurpose,
  loadSkillsForWorkspace,
  getPriorityLabel,
  buildContextualSystemPrompt,
} from "@/lib/chat";
import type { WorkspacePurpose } from "@/lib/design-tokens";
import type { WorkspaceSoul, Brand, WorkspaceMemory } from "@/lib/types";
import { loadWorkspaceContext } from "@/lib/brand-utils";
import { createSkillTools } from "@/lib/chat/tools/skill-creator-tool";
import { getLastUserMessageText } from "@/lib/memory-utils";

export const maxDuration = 30;

interface SubtaskContext {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  priority: number;
  status: string;
  aiAssignable: boolean;
}

interface IssueContext {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  comments: Array<{ body: string }>;
  subtasks?: SubtaskContext[];
}

function buildSystemPrompt(
  issueContext: IssueContext,
  purpose: WorkspacePurpose,
  soul: WorkspaceSoul | null,
  brand: Brand | null,
  memories: WorkspaceMemory[] = []
): string {
  const commentsText =
    issueContext.comments.length > 0
      ? `Comments:\n${issueContext.comments.map((c) => `- ${c.body}`).join("\n")}`
      : "";

  const subtasks = issueContext.subtasks || [];
  const subtasksText =
    subtasks.length > 0
      ? `Subtasks:\n${subtasks.map((s) => `- [${s.identifier}] "${s.title}" (ID: ${s.id}, Priority: ${getPriorityLabel(s.priority)}, Status: ${s.status}${s.aiAssignable ? ", AI Task" : ""})`).join("\n")}`
      : "";

  const basePrompt = `You are helping refine an existing ${purpose === "marketing" ? "marketing task" : "issue"} in a kanban board.

Title: ${issueContext.title}
Description: ${issueContext.description || "(No description yet)"}
Status: ${issueContext.status}
Priority: ${getPriorityLabel(issueContext.priority)}
${commentsText}
${subtasksText}

## Your Role

Help the user break down work into actionable AI subtasks, manage existing subtasks, and refine the issue description. ${purpose === "marketing" ? "Focus on marketing best practices." : "Focus on software best practices."}

## CRITICAL: Suggest Subtasks, Don't Execute

When the user asks you to do something (research, write, analyze, create, etc.), use **suggestAITasks** to create subtasks instead of performing the work yourself. Only execute directly if the user explicitly says "do it now" or similar.

Before creating subtasks, call **get_subtask_guidelines** to ensure they are independent and well-structured. If existing subtasks have issues (e.g., sequential instead of parallel), delete and replace them.

${issueContext.description ? `This issue has a description — **ask before updating it**.` : `No description yet — **eagerly update it** once you understand the goal.`}

Use **search_knowledge** to find relevant workspace documents when you need background context.

Be conversational and helpful. Ask clarifying questions when needed.`;

  return buildContextualSystemPrompt(basePrompt, soul, brand, memories);
}

export async function POST(req: Request) {
  const { messages, issueContext, workspacePurpose, workspaceId } =
    (await req.json()) as {
      messages: UIMessage[];
      issueContext: IssueContext;
      workspacePurpose?: WorkspacePurpose;
      workspaceId?: string;
    };

  const purpose = workspacePurpose ?? "software";

  // Extract last user message for memory search
  const lastUserMessage = getLastUserMessageText(messages);

  // Load workspace context (soul, brand, and memories) in parallel
  const { soul, brand, memories } = await loadWorkspaceContext(workspaceId, lastUserMessage);

  // Load skills - use workspace skills if workspaceId provided, otherwise just purpose-based
  const skills = workspaceId
    ? await loadSkillsForWorkspace(workspaceId, purpose)
    : await loadSkillsForPurpose(purpose);

  // Create tools with issue context, memory tools, and skill tools
  const issueTools = createIssueTools({ issueId: issueContext.id });
  const memoryTools = workspaceId ? createMemoryTools({ workspaceId }) : {};
  const skillTools = createSkillTools(workspaceId);
  const tools = { ...issueTools, ...memoryTools, ...skillTools };

  return createChatResponse(messages, {
    system: buildSystemPrompt(
      issueContext,
      purpose,
      soul,
      brand,
      memories
    ),
    tools,
    builtInTools: {
      webSearch: true,
      codeExecution: true,
      webFetch: true,
    },
    skills,
    workspaceId,
    usageSource: "issue",
  });
}
