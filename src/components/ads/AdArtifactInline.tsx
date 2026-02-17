"use client";

import { useEffect, useState, Suspense, lazy, type ComponentType } from "react";
import { Loader2, Expand, Instagram, Video, Linkedin, Search, Facebook } from "lucide-react";
import { ArtifactProvider } from "@/components/ads/context/ArtifactProvider";
import { getTemplateEntry } from "@/components/ads/schemas";
import { getAdArtifact } from "@/lib/actions/ad-artifacts";
import { AdArtifactPreview } from "@/components/ads/AdArtifactPreview";
import { cn } from "@/lib/utils";
import type { Artifact } from "@/components/ads/types/ArtifactData";

const PLATFORM_ICONS: Record<string, typeof Instagram> = {
  instagram: Instagram,
  tiktok: Video,
  linkedin: Linkedin,
  google: Search,
  facebook: Facebook,
};

interface AdArtifactInlineProps {
  artifactId: string;
  name: string;
  platform: string;
  templateType: string;
  workspaceId: string;
  onExpand?: () => void;
}

export function AdArtifactInline({
  artifactId,
  name,
  platform,
  templateType,
  workspaceId,
  onExpand,
}: AdArtifactInlineProps) {
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

        const templateTypeKey = `ad-template:${result.platform}-${result.templateType}`;
        const entry = getTemplateEntry(templateTypeKey);

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
          content: parsedContent as string,
          type: templateTypeKey,
        };

        if (!cancelled) {
          setArtifact({
            data: artifactData,
            type: templateTypeKey,
            workspaceId: result.workspaceId,
            resolvedMediaUrls: result.resolvedMediaUrls,
            resolvedMediaBySlot: result.resolvedMediaBySlot ?? [],
          });

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

  const PlatformIcon = PLATFORM_ICONS[platform] || Instagram;

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 w-full max-w-sm mt-3 p-3 rounded-lg bg-background/50 border border-border/50">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted border border-border text-muted-foreground">
          <PlatformIcon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Loading preview…
          </p>
        </div>
      </div>
    );
  }

  if (error || !artifact) {
    return (
      <AdArtifactPreview
        name={name}
        platform={platform}
        templateType={templateType}
        onView={onExpand}
      />
    );
  }

  return (
    <div className="mt-3 max-w-sm">
      <ArtifactProvider
        artifact={artifact.data}
        name={artifact.data.name}
        artifactId={artifact.data.id}
        workspaceId={workspaceId}
        mediaUrls={artifact.resolvedMediaBySlot}
        enableGenerate={false}
        onRegenerate={() => {}}
        onSave={() => {}}
      >
        <div className="w-full bg-background/50 border border-border/50 rounded-lg overflow-hidden">
          {/* Compact toolbar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
            <div className="flex items-center gap-2 min-w-0">
              <PlatformIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs font-medium truncate">{artifact.data.name}</span>
            </div>
            {onExpand && (
              <button
                onClick={onExpand}
                className="p-1 rounded-md hover:bg-muted transition-colors shrink-0"
                title="Expand"
              >
                <Expand className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Template preview */}
          <div className="overflow-hidden">
            {TemplateComponent ? (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center p-6">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                }
              >
                <TemplateComponent />
              </Suspense>
            ) : (
              <div className="p-3 text-xs text-muted-foreground">
                Template not found for type: {artifact.type}
              </div>
            )}
          </div>
        </div>
      </ArtifactProvider>
    </div>
  );
}
