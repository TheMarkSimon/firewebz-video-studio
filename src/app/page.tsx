import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Sparkles, Play } from "lucide-react";

export default function WelcomePage() {
  return (
    <AppShell>
      <div className="mx-auto flex max-w-2xl flex-col items-center pt-12 lg:pt-20">
        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-fw-purpleSoft">
          <Sparkles className="h-9 w-9 text-fw-purple" strokeWidth={1.75} />
        </div>

        <h1 className="text-center font-display text-[44px] leading-[1.1] text-fw-text md:text-[56px]">
          Hey there!<br />Let's make your first video.
        </h1>

        <p className="mt-6 max-w-lg text-center text-[18px] leading-[28px] text-fw-darkGray">
          Firewebz turns your product photos into ready-to-post Reels and TikToks — with captions, hashtags, and a monthly calendar.
        </p>

        <div className="mt-16 flex w-full max-w-sm flex-col gap-3">
          <Button asChild size="lg" className="w-full">
            <Link href="/onboarding">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/dashboard">
              <Play className="h-4 w-4" />
              See sample business
            </Link>
          </Button>
        </div>

        <p className="mt-10 text-center text-[14px] text-fw-lightGray">
          Local MVP — no account needed.
        </p>
      </div>
    </AppShell>
  );
}
