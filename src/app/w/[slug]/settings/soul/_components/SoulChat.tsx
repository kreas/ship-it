"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot, User } from "lucide-react";
import { MarkdownContent } from "@/components/ai-elements/MarkdownContent";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputActions,
} from "@/components/ai-elements/prompt-input";
import { cn } from "@/lib/utils";
import { useAutoFocusOnComplete } from "@/lib/hooks";
import type { WorkspaceSoul } from "@/lib/types";

interface SoulChatProps {
  currentSoul: WorkspaceSoul;
  initialPrompt?: string;
  onSoulChange: (soul: WorkspaceSoul) => void;
}

interface ToolOutput {
  success: boolean;
  action: string;
  name?: string;
  personality?: string;
  goals?: string[];
  tone?: WorkspaceSoul["tone"];
  responseLength?: WorkspaceSoul["responseLength"];
  expertise?: string[];
  term?: string;
  definition?: string;
  rules?: string[];
  greeting?: string;
}

export function SoulChat({
  currentSoul,
  initialPrompt,
  onSoulChange,
}: SoulChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const processedToolCallsRef = useRef<Set<string>>(new Set());
  const initialPromptSentRef = useRef(false);
  const [input, setInput] = useState("");

  const transport = new DefaultChatTransport({
    api: "/api/workspace/soul",
    body: {
      currentSoul,
    },
  });

  const { messages, sendMessage, status } = useChat({
    transport,
  });

  // Send initial prompt on mount
  useEffect(() => {
    if (initialPrompt && !initialPromptSentRef.current) {
      initialPromptSentRef.current = true;
      sendMessage({ text: initialPrompt });
    }
  }, [initialPrompt, sendMessage]);

  // Process tool calls to update soul configuration
  const processToolCalls = useCallback(() => {
    for (const message of messages) {
      if (message.role !== "assistant") continue;

      for (const part of message.parts) {
        const partType = part.type as string;
        if (!partType.startsWith("tool-")) continue;

        const toolPart = part as unknown as {
          toolCallId: string;
          state: string;
          output?: ToolOutput;
        };

        if (toolPart.state !== "output-available" || !toolPart.output) continue;
        if (processedToolCallsRef.current.has(toolPart.toolCallId)) continue;

        processedToolCallsRef.current.add(toolPart.toolCallId);
        const output = toolPart.output;

        switch (output.action) {
          case "setSoulName":
            if (output.name) {
              onSoulChange({ ...currentSoul, name: output.name });
            }
            break;

          case "setSoulPersonality":
            if (output.personality) {
              onSoulChange({ ...currentSoul, personality: output.personality });
            }
            break;

          case "setPrimaryGoals":
            if (output.goals) {
              onSoulChange({ ...currentSoul, primaryGoals: output.goals });
            }
            break;

          case "setTone":
            if (output.tone) {
              onSoulChange({ ...currentSoul, tone: output.tone });
            }
            break;

          case "setResponseLength":
            if (output.responseLength) {
              onSoulChange({ ...currentSoul, responseLength: output.responseLength });
            }
            break;

          case "setDomainExpertise":
            if (output.expertise) {
              onSoulChange({ ...currentSoul, domainExpertise: output.expertise });
            }
            break;

          case "addTerminology":
            if (output.term && output.definition) {
              onSoulChange({
                ...currentSoul,
                terminology: {
                  ...currentSoul.terminology,
                  [output.term]: output.definition,
                },
              });
            }
            break;

          case "setDoRules":
            if (output.rules) {
              onSoulChange({ ...currentSoul, doRules: output.rules });
            }
            break;

          case "setDontRules":
            if (output.rules) {
              onSoulChange({ ...currentSoul, dontRules: output.rules });
            }
            break;

          case "setGreeting":
            if (output.greeting) {
              onSoulChange({ ...currentSoul, greeting: output.greeting });
            }
            break;
        }
      }
    }
  }, [messages, currentSoul, onSoulChange]);

  useEffect(() => {
    processToolCalls();
  }, [processToolCalls]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-focus input when AI finishes responding
  useAutoFocusOnComplete(isLoading, textareaRef);

  const handleSubmit = () => {
    if (input.trim()) {
      sendMessage({ text: input });
      setInput("");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {isLoading && <LoadingMessage />}
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
            ref={textareaRef}
            placeholder="Describe your preferences..."
            rows={1}
          />
          <PromptInputActions>
            <PromptInputSubmit />
          </PromptInputActions>
        </PromptInput>
      </div>
    </div>
  );
}

interface ChatMessageProps {
  message: {
    id: string;
    role: string;
    parts: Array<{ type: string; text?: string }>;
  };
}

function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  // Extract text content, filtering out tool calls
  const textParts = message.parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text)
    .join("\n");

  if (!textParts) return null;

  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex items-center justify-center w-7 h-7 rounded-full shrink-0",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div
        className={cn(
          "flex flex-col gap-1 max-w-[85%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-lg px-3 py-2 text-sm overflow-hidden break-words",
            isUser ? "bg-primary text-primary-foreground" : "bg-muted"
          )}
        >
          <MarkdownContent content={textParts} />
        </div>
      </div>
    </div>
  );
}

function LoadingMessage() {
  return (
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
  );
}
