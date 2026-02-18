"use client";

import { useContext, useEffect, useRef, useState, useCallback, Suspense, type ComponentType } from "react";
import { X, Loader2, Paperclip, Minimize2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArtifactProvider } from "@/components/ads/context/ArtifactProvider";
import ArtifactControlsBar from "@/components/ads/components/ArtifactControlsBar";
import { getTemplateEntry } from "@/components/ads/schemas";
import { getAdArtifact } from "@/lib/actions/ad-artifacts";
import { saveArtifactAsChatAttachment } from "@/lib/actions/workspace-chat";
import { attachAdArtifactToIssue } from "@/lib/actions/ad-artifacts";
import { ChatContext } from "@/app/w/[slug]/chat/_components/ChatContext";
import { queryKeys } from "@/lib/query-keys";
import type { Artifact } from "@/components/ads/types/ArtifactData";

interface AdArtifactFullViewProps {
  artifactId: string;
  onClose: () => void;
  onCollapseToInline?: () => void;
  issueId?: string;
}

export function AdArtifactFullView({ artifactId, onClose, onCollapseToInline, issueId }: AdArtifactFullViewProps) {
  const chatContext = useContext(ChatContext);
  const selectedChatId = chatContext?.selectedChatId ?? null;
  const viewAttachment = chatContext?.viewAttachment;
  const queryClient = useQueryClient();
  const [isSavingAsAttachment, setIsSavingAsAttachment] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveAsAttachment = useCallback(async () => {
    if (issueId) {
      // Issue chat: attach to issue
      setIsSavingAsAttachment(true);
      setSaveError(null);
      try {
        const result = await attachAdArtifactToIssue(artifactId, issueId);
        if (result.success) {
          onClose();
        } else {
          setSaveError(result.error);
        }
      } finally {
        setIsSavingAsAttachment(false);
      }
      return;
    }

    // Workspace chat: save as chat attachment
    if (!selectedChatId) return;
    setIsSavingAsAttachment(true);
    setSaveError(null);
    try {
      const result = await saveArtifactAsChatAttachment(artifactId, selectedChatId);
      if (result.success) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.workspaceChat.attachments(selectedChatId),
        });
        onClose();
        viewAttachment?.(result.attachmentId);
      } else {
        setSaveError(result.error);
      }
    } finally {
      setIsSavingAsAttachment(false);
    }
  }, [artifactId, issueId, selectedChatId, queryClient, viewAttachment, onClose]);

  const [artifact, setArtifact] = useState<{
    data: Artifact;
    type: string;
    workspaceId: string;
    resolvedMediaUrls: string[];
    resolvedMediaBySlot: Array<{
      imageUrls: string[];
      videoUrls: string[];
      currentIndex: number;
      currentImageUrl: string | null;
      generatedAt: Date;
      showVideo: boolean;
    }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [TemplateComponent, setTemplateComponent] = useState<ComponentType | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const templateRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);

  useEffect(() => {
    const container = containerRef.current;
    const template = templateRef.current;
    if (!container || !template) return;

    const updateScale = () => {
      const cRect = container.getBoundingClientRect();
      const tRect = template.getBoundingClientRect();
      // Divide out current scale to get natural dimensions
      const currentScale = scaleRef.current;
      const naturalW = tRect.width / currentScale;
      const naturalH = tRect.height / currentScale;
      if (naturalW === 0 || naturalH === 0) return;
      const availW = cRect.width - 32; // p-4 padding on each side
      const availH = cRect.height - 32;
      const newScale = Math.min(availW / naturalW, availH / naturalH, 1);
      if (Math.abs(newScale - currentScale) > 0.001) {
        scaleRef.current = newScale;
        setScale(newScale);
      }
    };

    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    observer.observe(template);
    return () => observer.disconnect();
  }, [artifact, TemplateComponent]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getAdArtifact(artifactId);
        if (cancelled || !result) {
          if (!cancelled) setError("Artifact not found");
          return;
        }

        const templateType = `ad-template:${result.platform}-${result.templateType}`;
        const entry = getTemplateEntry(templateType);

        // Parse the stored content JSON
        let parsedContent: unknown;
        try {
          parsedContent = JSON.parse(result.content);
        } catch {
          parsedContent = result.content;
        }

        const artifactData: Artifact = {
          id: result.id,
          name: result.name,
          format: "ad-template",
          // The templates expect content as a parsed object (accessed via useArtifact().content)
          content: parsedContent as string,
          type: templateType,
        };

        if (!cancelled) {
          setArtifact({
            data: artifactData,
            type: templateType,
            workspaceId: result.workspaceId,
            resolvedMediaUrls: result.resolvedMediaUrls,
            resolvedMediaBySlot: result.resolvedMediaBySlot ?? [],
          });

          // Lazy-load the template component
          if (entry) {
            const mod = await entry.component();
            if (!cancelled) {
              setTemplateComponent(() => mod.default);
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load artifact");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [artifactId]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full border-l border-border bg-background">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm text-muted-foreground">Loading ad...</span>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !artifact) {
    return (
      <div className="flex flex-col h-full border-l border-border bg-background">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm text-red-500">Error</span>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground">{error || "Artifact not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border-l border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border shrink-0">
        <span className="text-sm font-medium truncate min-w-0">{artifact.data.name}</span>
        <div className="flex items-center gap-1 shrink-0">
          {onCollapseToInline && (
            <button
              type="button"
              onClick={onCollapseToInline}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
              title="Collapse to inline"
            >
              <Minimize2 className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          <button
            type="button"
            onClick={handleSaveAsAttachment}
            disabled={(!selectedChatId && !issueId) || isSavingAsAttachment}
            className="p-1.5 rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none"
            title={issueId ? "Attach to issue" : selectedChatId ? "Save as attachment" : "Select a chat to save as attachment"}
          >
            {isSavingAsAttachment ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <Paperclip className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      {saveError && (
        <div className="px-4 py-2 text-xs text-red-500 bg-red-500/10 border-b border-border">
          {saveError}
        </div>
      )}

      {/* Content */}
      <div ref={containerRef} className="flex-1 overflow-hidden p-4 flex items-start justify-center">
        <ArtifactProvider
          artifact={artifact.data}
          name={artifact.data.name}
          artifactId={artifact.data.id}
          workspaceId={artifact.workspaceId}
          mediaUrls={artifact.resolvedMediaBySlot}
          enableGenerate={true}
          onRegenerate={() => {}}
          onSave={() => {}}
        >
          <div
            ref={templateRef}
            className="bg-muted/30 border border-border rounded-lg pb-6"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
            }}
          >
            <ArtifactControlsBar showMediaCount={true} />
            {TemplateComponent ? (
              <Suspense fallback={
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              }>
                <TemplateComponent />
              </Suspense>
            ) : (
              <div className="p-4 text-sm text-muted-foreground">
                Template not found for type: {artifact.type}
              </div>
            )}
          </div>
        </ArtifactProvider>
      </div>
    </div>
  );
}
