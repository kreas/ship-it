"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { RefreshCcw } from 'lucide-react';

interface GeneratedImageProps {
  prompt: string;
  size?: string;
  aspectRatio?: string;
  style?: string;
  alt: string;
  className?: string;
  'data-image-type'?: string;
  artifactId?: string;
  imageUrl?: string;
  loading?: boolean;
  enableGenerate?: boolean;
  onImageGenerated?: (imageUrl: string) => void;
  enableRegenerate?: boolean;
}

export default function GeneratedImage({
  prompt,
  size = '1365x1024',
  aspectRatio = '1:1',
  style = 'realistic_image',
  alt,
  className,
  'data-image-type': dataImageType,
  artifactId,
  onImageGenerated,
  imageUrl,
  loading = false,
  enableGenerate = false,
  enableRegenerate = false,
}: GeneratedImageProps) {
  const [generatedImage, setGeneratedImage] = useState<string | null>(imageUrl || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const hasAttemptedGeneration = useRef(false);
  const hasAttemptedRegenerate = useRef(false);

  // Load existing artifact image if available
  useEffect(() => {
    async function loadArtifact() {
      if (!artifactId) {
        setIsInitialized(true);
        return;
      }

      try {
        const response = await fetch(`/api/ads/artifacts/${artifactId}`);
        if (!response.ok) {
          setIsInitialized(true);
          return;
        }

        const data = await response.json();
        if (data.imageUrl) {
          setGeneratedImage(data.imageUrl);
          hasAttemptedGeneration.current = true;
        }
      } catch {
        // Ignore errors loading artifact
      }
      setIsInitialized(true);
    }

    loadArtifact();
  }, [artifactId]);

  const generateImage = useMemo(
    () =>
      async (forceRegenerate = false) => {
        if (!enableGenerate) return null;
        if (!forceRegenerate && imageUrl) return null;
        if (!prompt || !prompt.trim()) return null;
        if (isLoading) return null;
        if (!forceRegenerate && (generatedImage || hasAttemptedGeneration.current)) {
          if (generatedImage) {
            onImageGenerated?.(generatedImage);
          }
          return null;
        }

        setIsLoading(true);
        hasAttemptedGeneration.current = true;

        try {
          const response = await fetch('/api/ads/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, size, aspectRatio, style }),
          });

          if (!response.ok) {
            console.error('Failed to generate image');
            setIsLoading(false);
            return null;
          }

          const data = await response.json();
          const imageData = data as { url: string };
          setGeneratedImage(imageData.url);
          onImageGenerated?.(imageData.url);
          setIsLoading(false);
          return imageData;
        } catch (error) {
          console.error('Failed to generate image:', error);
          setIsLoading(false);
          return null;
        }
      },
    [prompt, size, aspectRatio, style, onImageGenerated, isLoading, generatedImage, enableGenerate, imageUrl],
  );

  // Generate image when enableGenerate becomes true
  useEffect(() => {
    if (enableGenerate && prompt && prompt.trim() && !generatedImage && !hasAttemptedGeneration.current) {
      generateImage();
    }
  }, [enableGenerate, prompt, generatedImage, generateImage]);

  const handleRegenerate = async () => {
    setGeneratedImage(null);
    await generateImage(true);
  };

  useEffect(() => {
    if (!enableRegenerate) {
      hasAttemptedRegenerate.current = false;
      return;
    }
    if (!prompt || !prompt.trim()) return;
    if (hasAttemptedRegenerate.current) return;

    handleRegenerate();
    hasAttemptedRegenerate.current = true;
  }, [enableRegenerate, prompt]);

  return (
    <div
      className="relative group h-full w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img
        src={imageUrl ?? (generatedImage || '/placeholder.svg')}
        alt={isLoading ? 'Generating image...' : alt}
        className={className}
        data-image-type={dataImageType}
      />
      {isLoading || loading ? (
        <div className="absolute inset-0 w-full h-full bg-black/50 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        isHovered && (
          <button
            onClick={handleRegenerate}
            className="absolute inset-0 w-full h-full bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-1 pt-4"
            aria-label="Regenerate image"
          >
            <RefreshCcw className="w-8 h-8 text-white" />
            <span className="text-white block text-sm">Regenerate</span>
          </button>
        )
      )}
    </div>
  );
}
