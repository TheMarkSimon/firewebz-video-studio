"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { removeFromCalendar, updateCalendarStatus } from "@/lib/actions/calendar";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

type Item = {
  id: string;
  date: string;
  platform: string;
  status: string;
  businessName: string;
  productName: string;
  conceptTitle: string;
  videoStyle: string;
  captionPreview: string;
  hasVideo: boolean;
};

const STATUS_VARIANTS: Record<string, "default" | "success" | "warning" | "outline"> = {
  concept: "outline",
  video_generated: "default",
  approved: "success",
  rejected: "warning",
  exported: "success",
};

export function CalendarClient({ items, platformLabels }: { items: Item[]; platformLabels: Record<string, string> }) {
  const [cursor, setCursor] = useState(new Date());
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();

  const byDate = new Map<string, Item[]>();
  for (const it of items) {
    const d = new Date(it.date);
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    const key = String(d.getDate());
    byDate.set(key, [...(byDate.get(key) ?? []), it]);
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {cursor.toLocaleString("en-US", { month: "long", year: "numeric" })}
        </h2>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-2">
            {cells.map((day, idx) => {
              const dayItems = day ? byDate.get(String(day)) ?? [] : [];
              return (
                <div
                  key={idx}
                  className={cn(
                    "min-h-[110px] rounded-lg border border-border p-2 text-left",
                    day ? "bg-secondary/30" : "bg-transparent border-transparent"
                  )}
                >
                  {day && (
                    <>
                      <div className="text-xs font-medium text-muted-foreground">{day}</div>
                      <div className="mt-1 space-y-1">
                        {dayItems.map((it) => (
                          <div key={it.id} className="rounded-md bg-firewebz-gradient/20 p-1.5 text-[10px] leading-tight">
                            <div className="font-semibold">{it.conceptTitle.slice(0, 28)}</div>
                            <div className="text-muted-foreground">{platformLabels[it.platform] ?? it.platform}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.length === 0 && <p className="text-sm text-muted-foreground">Nothing scheduled yet. Add items from a concept.</p>}
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3">
              <div className="w-24 text-xs text-muted-foreground">{formatDate(it.date)}</div>
              <div className="flex-1">
                <div className="text-sm font-medium">{it.conceptTitle}</div>
                <div className="text-xs text-muted-foreground">
                  {it.businessName} · {it.productName} · {platformLabels[it.platform] ?? it.platform} · {it.videoStyle}
                </div>
                {it.captionPreview && <div className="mt-1 text-xs text-muted-foreground">"{it.captionPreview}…"</div>}
              </div>
              <select
                className="h-8 rounded-md border border-border bg-secondary/40 px-2 text-xs"
                value={it.status}
                disabled={isPending}
                onChange={(e) => startTransition(async () => { await updateCalendarStatus(it.id, e.target.value); router.refresh(); })}
              >
                <option value="concept">concept</option>
                <option value="video_generated">video generated</option>
                <option value="approved">approved</option>
                <option value="rejected">rejected</option>
                <option value="exported">exported</option>
              </select>
              <Badge variant={STATUS_VARIANTS[it.status] ?? "default"}>{it.status}</Badge>
              <Button
                size="icon"
                variant="ghost"
                disabled={isPending}
                onClick={() => startTransition(async () => { await removeFromCalendar(it.id); router.refresh(); })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
