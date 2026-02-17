import { useArtifactContext } from '../context/ArtifactProvider';

/**
 * Hook to access basic artifact information
 */
export const useArtifact = () => {
  const { artifact, name, mediaUrls } = useArtifactContext();

  const imageCount = mediaUrls.reduce((acc, mediaUrl) => acc + (mediaUrl?.imageUrls?.length ?? 0), 0);
  const videoCount = mediaUrls.reduce((acc, mediaUrl) => acc + (mediaUrl?.videoUrls?.length ?? 0), 0);
  const mediaCount = mediaUrls.length;

  return {
    artifact,
    name,
    id: artifact.id,
    type: artifact.type,
    format: artifact.format,
    content: artifact.content,
    mediaCount,
    imageCount,
    videoCount,
  };
};
