import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { GenerateClient } from "@/components/generate-client";
import { SignInButton } from "@/components/auth-buttons";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

  const cached = spin.status === "ready" && spin.videoUrl
    ? {
        videoUrl: spin.videoUrl,
        frameUrls: (spin.frameUrls as string[] | null) ?? undefined,
        modelUsed: spin.modelUsed ?? undefined,
        durationMs: spin.durationMs ?? undefined,
      }
    : null;

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
        cachedResult={cached}
      />
    </AppShell>
  );
}
