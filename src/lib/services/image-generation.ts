import { GoogleGenAI } from "@google/genai";
import {
  uploadBuffer,
  generateAdMediaStorageKey,
  generateDownloadUrl,
} from "@/lib/storage/r2-client";

const MODEL_ID = "gemini-2.5-flash-image";

function getClient(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not configured");
  }
  return new GoogleGenAI({ apiKey });
}

export interface GenerateImageOptions {
  prompt: string;
  aspectRatio?: string; // "1:1" | "4:5" | "16:9" | "9:16"
  workspaceId: string;
  artifactId: string;
  mediaIndex?: number;
}

export interface GeneratedImage {
  storageKey: string;
  downloadUrl: string;
  prompt: string;
  aspectRatio: string;
}

/**
 * Generate an image using Google Nano Banana (Gemini 2.5 Flash Image)
 * and upload it to R2 storage.
 */
export async function generateImage(
  options: GenerateImageOptions
): Promise<GeneratedImage> {
  const { prompt, aspectRatio = "1:1", workspaceId, artifactId, mediaIndex = 0 } = options;

  const client = getClient();

  const response = await client.models.generateContent({
    model: MODEL_ID,
    contents: prompt,
    config: {
      responseModalities: ["IMAGE"],
    },
  });

  // Extract base64 image data from response
  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts || parts.length === 0) {
    throw new Error("No image data in response");
  }

  const imagePart = parts.find((part) => part.inlineData);
  if (!imagePart?.inlineData?.data) {
    throw new Error("No inline image data found in response");
  }

  const buffer = Buffer.from(imagePart.inlineData.data, "base64");
  const mimeType = imagePart.inlineData.mimeType || "image/png";
  const ext = mimeType === "image/webp" ? "webp" : mimeType === "image/jpeg" ? "jpg" : "png";
  const filename = `image_${mediaIndex}_${Date.now()}.${ext}`;
  const storageKey = generateAdMediaStorageKey(workspaceId, artifactId, filename);

  await uploadBuffer(storageKey, buffer, mimeType);
  const downloadUrl = await generateDownloadUrl(storageKey);

  return {
    storageKey,
    downloadUrl,
    prompt,
    aspectRatio,
  };
}

/**
 * Generate multiple images in parallel.
 */
export async function generateImages(
  optionsList: GenerateImageOptions[]
): Promise<GeneratedImage[]> {
  return Promise.all(optionsList.map(generateImage));
}
