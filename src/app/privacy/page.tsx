import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  robots: { index: true, follow: true },
  alternates: { canonical: "/privacy" },
};

// Honest, plain-language privacy policy matching what the product actually
// does. FOUNDER: review before App Store submission — this is a legal
// document published under your name.
export default function PrivacyPage() {
  return (
    <AppShell>
      <article className="mx-auto max-w-2xl pb-24 pt-10">
        <h1 className="font-display text-[32px] font-bold text-fw-text">Privacy Policy</h1>
        <p className="mt-1 text-[13px] text-fw-lightGray">Last updated: July 12, 2026</p>

        <Section title="Who we are">
          Spinr (thespinr.com) turns product photos into interactive 360° spins for
          e-commerce stores. Contact: <a className="underline" href="mailto:contact@thespinr.com">contact@thespinr.com</a>.
        </Section>

        <Section title="What we collect">
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>Account data:</strong> when you sign in with Google we receive your name, email address, and profile picture. We use them to operate your account. We never see your Google password.</li>
            <li><strong>Your content:</strong> the product photos you upload and the spin videos and image frames we generate from them.</li>
            <li><strong>Store data (only if you connect Shopify):</strong> your store&apos;s domain and name, product titles, handles, and product images — read via Shopify&apos;s API with the narrow permissions you approve (read/write products). We never request or store your shoppers&apos; or customers&apos; personal data.</li>
            <li><strong>Billing state:</strong> your plan and usage counts. Payments run entirely through Shopify — we never see or store payment card details.</li>
          </ul>
        </Section>

        <Section title="How we use it">
          To generate your spins, host your embeds, operate your account and plan, and
          contact you about your account. We do not sell personal data, run third-party
          advertising, or use your photos to train AI models.
        </Section>

        <Section title="Who processes data for us">
          We rely on a small set of service providers: Vercel (hosting), Neon (database),
          fal.ai (AI image/video processing and media hosting), Google (sign-in), and
          Shopify (store connection and billing). Each receives only what its role requires.
        </Section>

        <Section title="Cookies">
          We use only functional cookies: your sign-in session and short-lived security
          tokens during the Shopify connection flow. No advertising or cross-site tracking
          cookies.
        </Section>

        <Section title="Retention & deletion">
          Your spins and photos stay in your account until you delete them or your account.
          Deleting a spin removes it from our database (and its public embed stops
          working). To delete your account and all associated data, email{" "}
          <a className="underline" href="mailto:contact@thespinr.com">contact@thespinr.com</a>.
          For Shopify stores: uninstalling the app deletes our store connection and access
          token, and we honor Shopify&apos;s GDPR erasure webhooks automatically.
        </Section>

        <Section title="Your rights">
          Depending on where you live (GDPR, CCPA, or similar), you may have rights to
          access, correct, export, or erase your personal data. Email us and we&apos;ll
          honor them.
        </Section>

        <Section title="Changes">
          We&apos;ll update this page when our practices change and adjust the date above.
          Material changes will be announced in the product.
        </Section>
      </article>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-[18px] font-bold text-fw-text">{title}</h2>
      <div className="mt-2 text-[14px] leading-[23px] text-fw-darkGray">{children}</div>
    </section>
  );
}
