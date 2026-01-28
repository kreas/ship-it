"use client";

import { useState, useRef, useEffect } from "react";
import { ExternalLink } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";
import { cn } from "@/lib/utils";

interface SoulEmptyStateProps {
  onSubmit: (initialPrompt: string) => void;
}

export function SoulEmptyState({ onSubmit }: SoulEmptyStateProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        onSubmit(value.trim());
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="max-w-xl w-full space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">
            Define Your Workspace Soul
          </h2>
          <p className="text-muted-foreground">
            Describe what you want your AI assistant to be like. An AI will help
            you configure the details.
          </p>
        </div>

        <div className="space-y-3">
          <TextareaAutosize
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want your AI assistant to be like..."
            minRows={4}
            maxRows={8}
            className={cn(
              "w-full resize-none rounded-lg border border-border bg-muted/50 p-4 text-sm",
              "placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
              "min-h-[120px]"
            )}
          />
          <p className="text-xs text-muted-foreground text-center">
            Press Enter to start configuring, or Shift+Enter for a new line
          </p>
        </div>

        <div className="text-center">
          <a
            href="https://docs.example.com/workspace-souls"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Learn more about workspace souls
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
