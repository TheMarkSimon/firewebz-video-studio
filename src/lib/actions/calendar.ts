"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function addToCalendar(input: {
  businessId: string;
  conceptId?: string;
  generatedVideoId?: string;
  scheduledDate: string;
  platform: string;
  status?: string;
}) {
  await prisma.calendarItem.create({
    data: {
      businessId: input.businessId,
      conceptId: input.conceptId,
      generatedVideoId: input.generatedVideoId,
      scheduledDate: new Date(input.scheduledDate),
      platform: input.platform,
      status: input.status ?? "concept",
    },
  });
  revalidatePath("/calendar");
}

export async function removeFromCalendar(id: string) {
  await prisma.calendarItem.delete({ where: { id } });
  revalidatePath("/calendar");
}

export async function updateCalendarStatus(id: string, status: string) {
  await prisma.calendarItem.update({ where: { id }, data: { status } });
  revalidatePath("/calendar");
}
