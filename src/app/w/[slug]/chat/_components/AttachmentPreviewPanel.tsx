"use client";

import { useState, useCallback, useRef } from "react";
import { X, Copy, Check, Download, FileDown, FileText } from "lucide-react";
import { printElementAsPdf } from "@/lib/print-to-pdf";
import { MarkdownContent } from "@/components/ai-elements/MarkdownContent";
import { useChatContext } from "./ChatContext";
import { cn } from "@/lib/utils";

export function AttachmentPreviewPanel() {
  const { selectedAttachment, closeAttachment } = useChatContext();
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleCopy = useCallback(async () => {
    if (!selectedAttachment) return;
    try {
      await navigator.clipboard.writeText(selectedAttachment.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [selectedAttachment]);

  const handleDownload = useCallback(() => {
    if (!selectedAttachment) return;
    const blob = new Blob([selectedAttachment.content], { type: selectedAttachment.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedAttachment.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [selectedAttachment]);

  if (!selectedAttachment) return null;

  const isMarkdown =
    selectedAttachment.mimeType.includes("markdown") ||
    selectedAttachment.filename.endsWith(".md") ||
    selectedAttachment.filename.endsWith(".mdx");

  return (
    <div className="flex flex-col h-full border-l border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium truncate">
            {selectedAttachment.filename}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleCopy}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium",
              "bg-muted hover:bg-muted/80 transition-colors"
            )}
            title="Copy content"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium",
              "bg-muted hover:bg-muted/80 transition-colors"
            )}
            title="Download file"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {isMarkdown && (
            <button
              onClick={() => {
                if (contentRef.current) {
                  printElementAsPdf(
                    contentRef.current,
                    selectedAttachment.filename
                  );
                }
              }}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium",
                "bg-muted hover:bg-muted/80 transition-colors"
              )}
              title="Save as PDF"
            >
              <FileDown className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={closeAttachment}
            className={cn(
              "p-1.5 rounded-md",
              "hover:bg-muted transition-colors"
            )}
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div ref={contentRef} className="flex-1 overflow-auto p-4 scrollbar-thin">
        {isMarkdown ? (
          <MarkdownContent content={selectedAttachment.content} />
        ) : (
          <pre className="text-sm whitespace-pre-wrap font-mono">
            {selectedAttachment.content}
          </pre>
        )}
      </div>
    </div>
  );
}
