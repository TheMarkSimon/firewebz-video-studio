import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/onboarding-wizard";
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

// NO auth wall here — value-first onboarding. Anonymous visitors get the full
// upload playground (including live background removal); the sign-in gate is a
// modal that appears only when they click Generate, after they've invested in
// their photos. Saving/generating still requires auth server-side.
export default async function OnboardingPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await getSessionUser();

  // Edit mode: /onboarding?spin=<id> pre-fills the slots with the spin's
  // existing photos so the user can replace one and regenerate. Owner-only.
  const sp = await searchParams;
  const spinId = typeof sp.spin === "string" ? sp.spin : undefined;
  let editSpin = null;
  if (spinId && user) {
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
