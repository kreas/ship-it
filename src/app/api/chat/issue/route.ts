import { anthropic } from "@ai-sdk/anthropic";
import { streamText, tool, convertToModelMessages, type UIMessage } from "ai";
import { z } from "zod";

export const maxDuration = 30;

interface IssueContext {
  title: string;
  description: string | null;
  status: string;
  priority: number;
  comments: Array<{ body: string }>;
}

export async function POST(req: Request) {
  const { messages, issueContext } = (await req.json()) as {
    messages: UIMessage[];
    issueContext: IssueContext;
  };

  // Convert UI messages to model messages format
  const modelMessages = await convertToModelMessages(messages);

  const commentsText =
    issueContext.comments.length > 0
      ? `User comments on this issue:\n${issueContext.comments.map((c) => `- ${c.body}`).join("\n")}`
      : "No comments yet.";

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: `You are helping refine an existing issue in a kanban board. Here's the current issue:

Title: ${issueContext.title}
Description: ${issueContext.description || "(No description yet)"}
Status: ${issueContext.status}
Priority: ${issueContext.priority === 0 ? "Urgent" : issueContext.priority === 1 ? "High" : issueContext.priority === 2 ? "Medium" : issueContext.priority === 3 ? "Low" : "None"}

${commentsText}

Your job is to help the user:
1. Refine acceptance criteria and requirements
2. Clarify ambiguous parts of the issue
3. Improve the description with better structure
4. Suggest technical approaches when asked

When the user is happy with the refined description, use the updateDescription tool to update the issue.

Be conversational and helpful. Ask clarifying questions when needed. When suggesting a description update, explain what changes you're making and why.`,
    messages: modelMessages,
    tools: {
      updateDescription: tool({
        description:
          "Update the issue description with refined content. Use this when you have a clear, improved description ready.",
        inputSchema: z.object({
          description: z
            .string()
            .describe(
              "The updated description with acceptance criteria, user stories, or improved requirements"
            ),
        }),
        execute: async ({ description }) => {
          // The actual update happens client-side via onToolCall
          // This just provides a result so the conversation can continue
          return `Description updated to: "${description.substring(0, 50)}..."`;
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
