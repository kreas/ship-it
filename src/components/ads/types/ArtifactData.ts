export interface ArtifactMediaUrls {
  imageUrls: string[];
  videoUrls: string[];
  currentIndex: number;
  currentImageUrl: string | null;
  generatedAt: Date;
  showVideo: boolean;
}

export interface ArtifactSaveData {
  artifact: Artifact;
  mediaUrls: ArtifactMediaUrls[];
  metadata: {
    name: string;
    type: string;
    artifactId: string;
    lastModified: Date;
  };
}

export interface MediaTrackingCallbacks {
  onImageGenerated?: (url: string, context?: string) => void;
  onVideoGenerated?: (url: string, context?: string) => void;
  onMediaUrlsUpdated?: (urls: ArtifactMediaUrls) => void;
  onCurrentImageUrlUpdated?: (url: string) => void;
}

// Artifact type used throughout the ad system
export interface Artifact {
  id: string;
  name: string;
  format: string;
  content: string;
  type: string;
  mediaUrls?: ArtifactMediaUrls[];
}
