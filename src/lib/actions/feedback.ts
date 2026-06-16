"use server";

import { prisma } from "@/lib/db";
import { toJsonArray } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function submitFeedback(input: {
  generatedVideoId: string;
  rating: number;
  wouldPost: "yes" | "maybe" | "no";
  rejectionReasons: string[];
  notes?: string;
}) {
  await prisma.feedback.create({
    data: {
      generatedVideoId: input.generatedVideoId,
      rating: input.rating,
      wouldPost: input.wouldPost,
      rejectionReasons: toJsonArray(input.rejectionReasons),
      notes: input.notes,
    },
  });
  revalidatePath("/concepts");
  revalidatePath("/dashboard");
}
