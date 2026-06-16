import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import { parseJsonArray } from "@/lib/utils";
import { PLATFORM_LABELS, REJECTION_REASONS, type Platform } from "@/lib/types";
import { Sparkles, Film, Star, Users, Package, Calendar, TrendingUp, Plus } from "lucide-react";

export default async function DashboardPage() {
  const [businesses, products, concepts, videos, feedback] = await Promise.all([
    prisma.business.findMany({ include: { products: true } }),
    prisma.product.findMany(),
    prisma.videoConcept.findMany(),
    prisma.generatedVideo.findMany(),
    prisma.feedback.findMany(),
  ]);

  const ratings = feedback.map((f) => f.rating);
  const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "—";
  const wouldPostYes = feedback.filter((f) => f.wouldPost === "yes").length;
  const wouldPostMaybe = feedback.filter((f) => f.wouldPost === "maybe").length;
  const yesRate = feedback.length ? Math.round((wouldPostYes / feedback.length) * 100) : 0;
  const maybeRate = feedback.length ? Math.round((wouldPostMaybe / feedback.length) * 100) : 0;

  const reasonCounts: Record<string, number> = {};
  for (const f of feedback) for (const r of parseJsonArray(f.rejectionReasons)) reasonCounts[r] = (reasonCounts[r] ?? 0) + 1;

  const styleCounts: Record<string, number> = {};
  for (const c of concepts) styleCounts[c.videoStyle] = (styleCounts[c.videoStyle] ?? 0) + 1;

  const platformCounts: Record<string, number> = {};
  for (const v of videos) {
    const c = concepts.find((x) => x.id === v.conceptId);
    if (c) platformCounts[c.platform] = (platformCounts[c.platform] ?? 0) + 1;
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl pt-6 lg:pt-10">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-[40px] leading-[1.1] text-fw-text md:text-[48px]">Dashboard</h1>
            <p className="mt-2 text-[17px] text-fw-darkGray">Validation metrics from your demo sessions.</p>
          </div>
          <Button asChild size="sm" className="rounded-pill">
            <Link href="/onboarding"><Plus className="h-4 w-4" /> New post</Link>
          </Button>
        </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Metric tone="purple" icon={<Users className="h-5 w-5" />} label="Businesses" value={businesses.length} />
        <Metric tone="turquoise" icon={<Package className="h-5 w-5" />} label="Products" value={products.length} />
        <Metric tone="yellow" icon={<Sparkles className="h-5 w-5" />} label="Concepts" value={concepts.length} />
        <Metric tone="orange" icon={<Film className="h-5 w-5" />} label="Videos generated" value={videos.length} />
        <Metric tone="purple" icon={<Star className="h-5 w-5" />} label="Avg rating" value={avgRating} suffix="/5" />
        <Metric tone="turquoise" icon={<TrendingUp className="h-5 w-5" />} label="Would-post yes" value={`${yesRate}%`} />
        <Metric tone="yellow" icon={<TrendingUp className="h-5 w-5" />} label="Would-post maybe" value={`${maybeRate}%`} />
        <Metric tone="orange" icon={<Calendar className="h-5 w-5" />} label="Feedback entries" value={feedback.length} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="border border-fw-border">
          <CardHeader>
            <CardTitle>Concepts by style</CardTitle>
            <CardDescription>Which styles are you generating most?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(styleCounts).length === 0 && <p className="text-[16px] text-fw-lightGray">No concepts yet.</p>}
            {Object.entries(styleCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <BarRow key={k} label={k} value={v} max={Math.max(...Object.values(styleCounts))} />
            ))}
          </CardContent>
        </Card>

        <Card className="border border-fw-border">
          <CardHeader>
            <CardTitle>Videos by platform</CardTitle>
            <CardDescription>Where the generated videos would go.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(platformCounts).length === 0 && <p className="text-[16px] text-fw-lightGray">No videos yet.</p>}
            {Object.entries(platformCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <BarRow key={k} label={PLATFORM_LABELS[k as Platform] ?? k} value={v} max={Math.max(...Object.values(platformCounts))} />
            ))}
          </CardContent>
        </Card>

        <Card className="border border-fw-border lg:col-span-2">
          <CardHeader>
            <CardTitle>Rejection reasons</CardTitle>
            <CardDescription>What's blocking SMBs from posting?</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(reasonCounts).length === 0 ? (
              <p className="text-[16px] text-fw-lightGray">No feedback yet. Generate a video, then rate it.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {REJECTION_REASONS.filter((r) => reasonCounts[r]).map((r) => (
                  <Badge key={r} variant="outline">{r} <span className="ml-1 text-fw-lightGray">×{reasonCounts[r]}</span></Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-fw-border lg:col-span-2">
          <CardHeader>
            <CardTitle>Businesses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {businesses.map((b) => (
              <Link key={b.id} href={`/concepts?businessId=${b.id}`} className="flex items-center justify-between rounded-[15px] border border-fw-border bg-fw-page p-4 hover:bg-fw-purple/5">
                <div>
                  <div className="font-display text-[18px] leading-7 text-fw-black">{b.name}</div>
                  <div className="text-[14px] text-fw-lightGray">{b.category} · {b.products.length} product{b.products.length === 1 ? "" : "s"}</div>
                </div>
                <Badge variant="outline">Open</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Metric({ tone, icon, label, value, suffix }: { tone: "purple" | "turquoise" | "yellow" | "orange"; icon: React.ReactNode; label: string; value: number | string; suffix?: string }) {
  const bg = { purple: "bg-fw-purple", turquoise: "bg-fw-turquoise", yellow: "bg-fw-yellow", orange: "bg-fw-orange" }[tone];
  return (
    <Card className="border border-fw-border">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-12 w-12 items-center justify-center rounded-pill text-white ${bg}`}>{icon}</div>
        <div>
          <div className="text-[14px] text-fw-darkGray">{label}</div>
          <div className="font-display text-[24px] leading-8 text-fw-black">
            {value}{suffix && <span className="text-base text-fw-lightGray">{suffix}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.max(4, Math.round((value / max) * 100));
  return (
    <div>
      <div className="flex justify-between text-[14px]">
        <span className="text-fw-black">{label}</span>
        <span className="text-fw-lightGray">{value}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-pill bg-fw-page">
        <div className="h-full rounded-pill bg-fw-purple" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
