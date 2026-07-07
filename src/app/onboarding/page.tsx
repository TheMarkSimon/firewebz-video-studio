import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { AppShell } from "@/components/app-shell";
import { SignInButton } from "@/components/auth-buttons";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Create your 360° product spin",
  description:
    "Upload a few product photos. Spinr generates a full 360° interactive spin — clean background, studio lighting, ready to embed on Shopify.",
  alternates: { canonical: "/onboarding" },
};

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await getSessionUser();

  if (!user) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md py-24 text-center">
          <h1 className="font-display text-[28px] font-bold text-fw-text">Create a spin</h1>
          <p className="mt-2 text-[15px] text-fw-darkGray">
            Sign in with Google to create spins and keep them in your Studio. Free while in beta.
          </p>
          <div className="mt-6 flex justify-center">
            <SignInButton label="Sign in with Google" />
          </div>
        </div>
      </AppShell>
    );
  }

  // Edit mode: /onboarding?spin=<id> pre-fills the slots with the spin's
  // existing photos so the user can replace one and regenerate.
  const sp = await searchParams;
  const spinId = typeof sp.spin === "string" ? sp.spin : undefined;
  let editSpin = null;
  if (spinId) {
    const s = await prisma.spin.findUnique({ where: { id: spinId } });
    if (s && s.userId === user.id) editSpin = s;
  }

  return (
    <OnboardingWizard
      user={user}
      spinId={editSpin?.id}
      initialTitle={editSpin?.title}
      initialPhotos={editSpin ? {
        front: editSpin.photoFrontUrl,
        back: editSpin.photoBackUrl,
        left: editSpin.photoLeftUrl,
        right: editSpin.photoRightUrl,
      } : undefined}
    />
  );
}
