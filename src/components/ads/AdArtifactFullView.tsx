"use client";

import { useEffect, useState, Suspense, lazy, type ComponentType } from "react";
import { X, Loader2 } from "lucide-react";
import { ArtifactProvider } from "@/components/ads/context/ArtifactProvider";
import ArtifactControlsBar from "@/components/ads/components/ArtifactControlsBar";
import { getTemplateEntry } from "@/components/ads/schemas";
import { getAdArtifact } from "@/lib/actions/ad-artifacts";
import type { Artifact } from "@/components/ads/types/ArtifactData";

interface AdArtifactFullViewProps {
  artifactId: string;
  onClose: () => void;
}

export function AdArtifactFullView({ artifactId, onClose }: AdArtifactFullViewProps) {
  const [artifact, setArtifact] = useState<{
    data: Artifact;
    type: string;
    workspaceId: string;
    resolvedMediaUrls: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [TemplateComponent, setTemplateComponent] = useState<ComponentType | null>(null);

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
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <span className="text-sm font-medium truncate">{artifact.data.name}</span>
        <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <ArtifactProvider
          artifact={artifact.data}
          name={artifact.data.name}
          artifactId={artifact.data.id}
          workspaceId={artifact.workspaceId}
          enableGenerate={true}
          onRegenerate={() => {}}
          onSave={() => {}}
        >
          <div className="w-full bg-muted/30 border border-border rounded-lg pb-6">
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
