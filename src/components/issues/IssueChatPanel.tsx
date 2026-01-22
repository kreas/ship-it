"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot, User, Sparkles, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import {
  getIssueChatMessages,
  saveChatMessage,
  clearIssueChatMessages,
} from "@/lib/actions/chat";
import type { IssueWithLabels, Comment, ChatMessage } from "@/lib/types";

interface IssueContext {
  title: string;
  description: string | null;
  status: string;
  priority: number;
  comments: Array<{ body: string }>;
}

interface IssueChatPanelProps {
  issue: IssueWithLabels;
  comments: Comment[];
  onUpdateDescription: (description: string) => void;
}

// Convert persisted messages to UI message format
function persistedToUIMessages(persisted: ChatMessage[]): UIMessage[] {
  return persisted.map((msg) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant",
    parts: [{ type: "text" as const, text: msg.content }],
  }));
}

export function IssueChatPanel({
  issue,
  comments,
  onUpdateDescription,
}: IssueChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const lastSavedMessageRef = useRef<string | null>(null);
  const hasLoadedRef = useRef(false);

  // Build issue context for the API
  const issueContext: IssueContext = useMemo(
    () => ({
      title: issue.title,
      description: issue.description,
      status: issue.status,
      priority: issue.priority,
      comments: comments.map((c) => ({ body: c.body })),
    }),
    [issue.title, issue.description, issue.status, issue.priority, comments]
  );

  // Custom transport that includes issue context
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat/issue",
        body: { issueContext },
      }),
    [issueContext]
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
    onToolCall: ({ toolCall }) => {
      if (toolCall.toolName === "updateDescription") {
        const args = toolCall.input as { description: string };
        onUpdateDescription(args.description);
      }
    },
  });

  // Load persisted messages on mount
  useEffect(() => {
    if (hasLoadedRef.current) return;

    let mounted = true;
    setIsLoadingHistory(true);

    getIssueChatMessages(issue.id).then((persisted) => {
      if (mounted && persisted.length > 0) {
        setMessages(persistedToUIMessages(persisted));
        // Mark the last persisted message as already saved
        lastSavedMessageRef.current = persisted[persisted.length - 1].id;
      }
      if (mounted) {
        setIsLoadingHistory(false);
        hasLoadedRef.current = true;
      }
    });

    return () => {
      mounted = false;
    };
  }, [issue.id, setMessages]);

  // Save new messages as they come in
  useEffect(() => {
    if (messages.length === 0 || isLoadingHistory) return;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.id === lastSavedMessageRef.current) return;

    // Only save completed messages (not streaming)
    if (status === "streaming" && lastMessage.role === "assistant") return;

    // Extract text content from parts
    const textContent = lastMessage.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n");

    if (textContent) {
      saveChatMessage(issue.id, lastMessage.role, textContent);
      lastSavedMessageRef.current = lastMessage.id;
    }
  }, [messages, status, issue.id, isLoadingHistory]);

  // Handle clearing chat history
  const handleClearHistory = useCallback(async () => {
    await clearIssueChatMessages(issue.id);
    setMessages([]);
    lastSavedMessageRef.current = null;
  }, [issue.id, setMessages]);

  // Add welcome message if no messages exist
  const displayMessages =
    messages.length === 0
      ? [
          {
            id: "welcome",
            role: "assistant" as const,
            parts: [
              {
                type: "text" as const,
                text: `I'm here to help you refine **${issue.title}**. I can see the current description, status, and any comments.\n\nHow can I help? For example:\n- "Add acceptance criteria"\n- "Suggest improvements to the description"\n- "Break this down into smaller tasks"`,
              },
            ],
          },
        ]
      : messages;

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = () => {
    if (input.trim()) {
      sendMessage({ text: input });
      setInput("");
    }
  };

  if (isLoadingHistory) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground mt-2">Loading chat...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
        <h3 className="text-sm font-medium">AI Assistant</h3>
        {messages.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="p-0 rounded text-muted-foreground hover:text-red-500 cursor-pointer"
            title="Clear chat history"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {displayMessages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3",
              message.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center w-7 h-7 rounded-full shrink-0",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              {message.role === "user" ? (
                <User className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>
            <div
              className={cn(
                "flex flex-col gap-1 max-w-[85%]",
                message.role === "user" ? "items-end" : "items-start"
              )}
            >
              <div
                className={cn(
                  "rounded-lg px-3 py-2 text-sm",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {message.parts.map((part, index) => {
                  if (part.type === "text") {
                    return (
                      <div
                        key={index}
                        className="prose prose-sm dark:prose-invert max-w-none"
                      >
                        <ReactMarkdown>{part.text}</ReactMarkdown>
                      </div>
                    );
                  }
                  // Tool calls show a confirmation message
                  if (part.type?.startsWith("tool-")) {
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Description updated</span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-muted shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1 px-3 py-2 rounded-lg bg-muted">
              <span className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" />
              <span
                className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce"
                style={{ animationDelay: "0.1s" }}
              />
              <span
                className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce"
                style={{ animationDelay: "0.2s" }}
              />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border shrink-0">
        <PromptInput
          value={input}
          onValueChange={setInput}
          isLoading={isLoading}
          onSubmit={handleSubmit}
        >
          <PromptInputTextarea
            placeholder="Ask to refine requirements, add acceptance criteria..."
            rows={1}
          />
          <PromptInputSubmit />
        </PromptInput>
      </div>
    </div>
  );
}
