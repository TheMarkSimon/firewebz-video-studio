"use server";

import { getSession } from "@/lib/session-store";
import { getMesh3dProvider } from "@/lib/providers/mesh3d/replicate";

export interface Mesh3dGenerationResult {
  status: "completed" | "failed";
  glbUrl?: string;
  previewImageUrl?: string;
  errorMessage?: string;
  diagnostics: {
    provider: string;
    modelUsed?: string;
    durationMs?: number;
    photosUsed: { front: boolean; back: boolean; left: boolean; right: boolean };
    photoCount: number;
  };
}

export async function generateMesh3dFromSession(sessionId: string): Promise<Mesh3dGenerationResult> {
  const session = await getSession(sessionId);
  if (!session) {
    return {
      status: "failed",
      errorMessage: "Session expired. Please start a new post.",
      diagnostics: {
        provider: "unknown",
        photosUsed: { front: false, back: false, left: false, right: false },
        photoCount: 0,
      },
    };
  }

  const photos = session.productPhotos ?? {};
  if (!photos.front) {
    return {
      status: "failed",
      errorMessage: "At least a front photo is required.",
      diagnostics: {
        provider: "unknown",
        photosUsed: { front: false, back: !!photos.back, left: !!photos.left, right: !!photos.right },
        photoCount: [photos.front, photos.back, photos.left, photos.right].filter(Boolean).length,
      },
    };
  }

  const provider = getMesh3dProvider();
  // Prompt intentionally describes only product identity + texture quality.
  // Camera angle, rotation, and viewpoint are controlled by the frontend
  // <model-viewer> in generate-client.tsx — never in this prompt.
  const productLabel = session.category ? `${session.category} product` : "product";
  const caption = `${productLabel} for ${session.businessName}, high-fidelity 3D asset for e-commerce, clean topology, realistic PBR materials.`;

  const result = await provider.generate({
    frontImageDataUrl: photos.front,
    backImageDataUrl: photos.back,
    leftImageDataUrl: photos.left,
    rightImageDataUrl: photos.right,
    caption,
  });

  return {
    status: result.status,
    glbUrl: result.glbUrl,
    previewImageUrl: result.previewImageUrl,
    errorMessage: result.errorMessage,
    diagnostics: {
      provider: provider.name,
      modelUsed: result.modelUsed,
      durationMs: result.durationMs,
      photosUsed: {
        front: !!photos.front,
        back: !!photos.back,
        left: !!photos.left,
        right: !!photos.right,
      },
      photoCount: [photos.front, photos.back, photos.left, photos.right].filter(Boolean).length,
    },
  };
}
