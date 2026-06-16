import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { CalendarClient } from "@/components/calendar-client";
import { PLATFORM_LABELS, type Platform } from "@/lib/types";

export default async function CalendarPage() {
  const items = await prisma.calendarItem.findMany({
    include: { business: true, concept: { include: { product: true } }, generatedVideo: true },
    orderBy: { scheduledDate: "asc" },
  });
  const serialized = items.map((it) => ({
    id: it.id,
    date: it.scheduledDate.toISOString(),
    platform: it.platform,
    status: it.status,
    businessName: it.business.name,
    productName: it.concept?.product.name ?? "—",
    conceptTitle: it.concept?.title ?? "—",
    videoStyle: it.concept?.videoStyle ?? "",
    captionPreview: it.concept?.caption.slice(0, 100) ?? "",
    hasVideo: Boolean(it.generatedVideoId),
  }));
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl pt-6 lg:pt-10">
        <div className="mb-10">
          <h1 className="font-display text-[40px] leading-[1.1] text-fw-text md:text-[48px]">Monthly calendar</h1>
          <p className="mt-2 text-[17px] text-fw-darkGray">Plan and track your content across platforms.</p>
        </div>
        <CalendarClient items={serialized} platformLabels={PLATFORM_LABELS as Record<Platform, string>} />
      </div>
    </AppShell>
  );
}
