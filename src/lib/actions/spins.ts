"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";

function readPhoto(formData: FormData, name: string): string | undefined {
  const val = formData.get(name);
  return typeof val === "string" && (val.startsWith("http") || val.startsWith("data:"))
    ? val
    : undefined;
}

// Create a new spin draft — or, when spinId is present, replace the photos on
// an existing spin (the "replace photo mid-flow" path). Replacing photos
// invalidates any previously generated video.
export async function saveSpinPhotos(formData: FormData): Promise<string> {
  const userId = await getUserId();
  if (!userId) throw new Error("Please sign in to create a spin.");

  const photos = {
    photoFrontUrl: readPhoto(formData, "photo_front"),
    photoBackUrl: readPhoto(formData, "photo_back"),
    photoLeftUrl: readPhoto(formData, "photo_left"),
    photoRightUrl: readPhoto(formData, "photo_right"),
  };
  if (!photos.photoFrontUrl) throw new Error("A front photo is required.");

  const title = (formData.get("title") as string)?.trim() || "Untitled product";
  const spinId = formData.get("spinId") as string | null;

  if (spinId) {
    const existing = await prisma.spin.findUnique({ where: { id: spinId } });
    if (!existing || existing.userId !== userId) throw new Error("Spin not found.");
    await prisma.spin.update({
      where: { id: spinId },
      data: {
        ...photos,
        title,
        // New photos → old video no longer represents them.
        status: "draft",
        videoUrl: null,
        frameUrls: undefined,
        modelUsed: null,
        durationMs: null,
        errorMessage: null,
      },
    });
    revalidatePath("/studio");
    return spinId;
  }

  const spin = await prisma.spin.create({ data: { userId, title, ...photos } });
  revalidatePath("/studio");
  return spin.id;
}

export async function deleteSpin(spinId: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) throw new Error("Please sign in.");
  const spin = await prisma.spin.findUnique({ where: { id: spinId } });
  if (!spin || spin.userId !== userId) throw new Error("Spin not found.");
  await prisma.spin.delete({ where: { id: spinId } });
  revalidatePath("/studio");
}
