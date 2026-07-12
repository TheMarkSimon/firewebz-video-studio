import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Terms of Service",
  robots: { index: true, follow: true },
  alternates: { canonical: "/terms" },
};

// Plain-language terms matching how the product actually works. FOUNDER:
// review before App Store submission — this is a legal document.
export default function TermsPage() {
  return (
    <AppShell>
      <article className="mx-auto max-w-2xl pb-24 pt-10">
        <h1 className="font-display text-[32px] font-bold text-fw-text">Terms of Service</h1>
        <p className="mt-1 text-[13px] text-fw-lightGray">Last updated: July 12, 2026</p>

        <Section title="The service">
          Spinr generates interactive 360° product spins from photos you provide and hosts
          them for embedding on your storefront. AI-generated output varies: we don&apos;t
          guarantee that every generation will be usable, which is why failed generations
          never count against your plan.
        </Section>

        <Section title="Your account">
          You sign in with Google and are responsible for activity under your account. You
          must be authorized to act for the store you connect.
        </Section>

        <Section title="Plans & billing">
          The Free plan includes a fixed number of spins. Paid plans are billed through
          Shopify&apos;s billing system on your Shopify invoice — a monthly subscription
          plus a per-spin charge beyond the included quota, always shown before you
          approve. A &quot;spin&quot; is one generation run: failures are refunded
          automatically; regenerations count. Viewing and hosting of generated spins is
          not metered. You can cancel anytime in your Studio or by uninstalling the app;
          Shopify&apos;s refund practices apply to charges already invoiced.
        </Section>

        <Section title="Your content">
          Your photos and products remain yours. You grant us the limited license needed
          to process them (background removal, video generation, hosting embeds). The
          generated spins are yours to use for your business. You&apos;re responsible for
          having rights to the photos you upload — don&apos;t upload content you don&apos;t
          own or products you aren&apos;t authorized to sell.
        </Section>

        <Section title="Acceptable use">
          No unlawful content, no attempts to break, overload, or reverse-engineer the
          service, no reselling generations outside your own stores without our written
          OK. We may suspend accounts that abuse the service or create risk for others.
        </Section>

        <Section title="Disclaimers & liability">
          The service is provided &quot;as is&quot; without warranties. To the maximum
          extent permitted by law, our total liability for any claim is limited to the
          amounts you paid us in the three months before the claim. We&apos;re not liable
          for indirect damages, lost profits, or the content of AI-generated output.
        </Section>

        <Section title="Termination">
          You can stop using Spinr anytime. We may terminate accounts for breach of these
          terms with notice where practicable. On termination, embeds tied to your spins
          stop being served.
        </Section>

        <Section title="Governing law & changes">
          These terms are governed by the laws of Israel. We may update them; material
          changes will be announced in the product, and continued use after changes means
          acceptance. Questions:{" "}
          <a className="underline" href="mailto:contact@thespinr.com">contact@thespinr.com</a>.
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
