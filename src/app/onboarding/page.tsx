import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/onboarding-wizard";

export const metadata: Metadata = {
  title: "Create your 360° product spin",
  description:
    "Upload one product photo. Spinr generates a full 360° interactive spin — clean background, studio lighting, ready to embed on Shopify.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/onboarding" },
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
