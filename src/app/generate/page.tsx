import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { GenerateClient } from "@/components/generate-client";
import { SignInButton } from "@/components/auth-buttons";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSpinVideoProvider } from "@/lib/providers/spinvideo";
import type { SpinStatusPayload } from "@/lib/actions/spinvideo";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

export default async function GeneratePage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await getSessionUser();
  if (!user) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md py-24 text-center">
          <h1 className="font-display text-[28px] font-bold text-fw-text">Sign in to continue</h1>
          <div className="mt-6 flex justify-center">
            <SignInButton label="Sign in with Google" />
          </div>
        </div>
      </AppShell>
    );
  }

  const sp = await searchParams;
  const spinId = typeof sp.spin === "string" ? sp.spin : undefined;
  const spin = spinId ? await prisma.spin.findUnique({ where: { id: spinId } }) : null;

  if (!spin || spin.userId !== user.id) {
    return (
      <AppShell user={user}>
        <div className="mx-auto max-w-md py-24 text-center">
          <h1 className="font-display text-[28px] font-bold text-fw-text">Spin not found</h1>
          <p className="mt-2 text-[15px] text-fw-darkGray">It may have been deleted.</p>
          <Link href="/studio" className="mt-6 inline-block rounded-pill bg-fw-purple px-6 py-3 text-[14px] font-semibold text-fw-black">
            Back to Studio
          </Link>
        </div>
      </AppShell>
    );
  }

  // Snapshot of the row's generation state. A reopened tab mid-generation
  // (or the emailed link) resumes exactly where the spin is: "generating"
  // starts the client polling, "ready" renders instantly and free.
  const initial: SpinStatusPayload = {
    status: (spin.status as SpinStatusPayload["status"]) ?? "draft",
    videoUrl: spin.videoUrl ?? undefined,
    frameUrls: (spin.frameUrls as string[] | null) ?? undefined,
    modelUsed: spin.modelUsed ?? undefined,
    durationMs: spin.durationMs ?? undefined,
    errorMessage: spin.errorMessage ?? undefined,
    startedAtMs: spin.generateStartedAt?.getTime(),
    provider: getSpinVideoProvider().name,
    cached: spin.status === "ready" ? true : undefined,
    emailNotify: spin.status === "generating" ? Boolean(process.env.RESEND_API_KEY) : undefined,
  };

  // autostart=1 (set by the onboarding wizard when the user clicked
  // "Generate my spin") skips the preview's second click and starts the
  // generation on arrival. Only meaningful on a draft — a ready/generating/
  // failed row renders its own state, so a stale/replayed URL can't trigger
  // a paid run (startSpinGeneration is cache-first on top of that).
  const autoStart = sp.autostart === "1" && spin.status === "draft";

  return (
    <AppShell user={user}>
      <GenerateClient
        spinId={spin.id}
        photos={{
          front: spin.photoFrontUrl,
          back: spin.photoBackUrl,
          left: spin.photoLeftUrl,
          right: spin.photoRightUrl,
        }}
        initial={initial}
        autoStart={autoStart}
      />
    </AppShell>
  );
}
