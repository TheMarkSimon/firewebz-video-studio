import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Mail, MessageCircleQuestion, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Help & Support",
  description:
    "Get help with Spinr: ask our support assistant anything about creating 360° product spins, Shopify setup, embeds, or billing — or email us directly.",
  alternates: { canonical: "/help" },
};

// Full-page support: the Chatbase agent (same brain as the site bubble)
// embedded as an iframe, with direct-contact fallback beside it. The
// floating bubble is excluded on this route (support-chat.tsx) so there
// aren't two chat UIs on one page.
const CHATBASE_ID = process.env.NEXT_PUBLIC_CHATBASE_ID;

export default function HelpPage() {
  return (
    <AppShell variant="marketing">
      <div className="mx-auto max-w-5xl pb-24 pt-14">
        <div className="text-center">
          <h1 className="font-display text-[36px] font-bold leading-tight text-fw-text md:text-[44px]">
            How can we help?
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-[24px] text-fw-darkGray">
            Ask the Spinr assistant anything — photo requirements, Shopify setup, embeds,
            billing. It knows the product inside out, and a human is one email away.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-[1fr_320px]">
          {/* Chat */}
          <div className="overflow-hidden rounded-3xl border border-fw-border bg-white shadow-[0_24px_80px_-40px_rgba(16,16,18,0.25)]">
            {CHATBASE_ID ? (
              <iframe
                src={`https://www.chatbase.co/chatbot-iframe/${CHATBASE_ID}`}
                title="Spinr support assistant"
                className="h-[640px] w-full"
                style={{ border: 0 }}
              />
            ) : (
              <div className="flex h-[640px] items-center justify-center p-8 text-center text-[14px] text-fw-darkGray">
                The support assistant is warming up — email us below and we&apos;ll help
                directly.
              </div>
            )}
          </div>

          {/* Contact rail */}
          <div className="space-y-5">
            <div className="rounded-3xl border border-fw-border bg-white p-6">
              <Mail className="h-5 w-5 text-fw-black" />
              <h2 className="mt-3 text-[16px] font-bold text-fw-text">Talk to a human</h2>
              <p className="mt-1.5 text-[13px] leading-[21px] text-fw-darkGray">
                Billing questions, account issues, or anything the assistant can&apos;t
                answer — email us and the founder replies personally, usually within one
                business day.
              </p>
              <a
                href="mailto:contact@thespinr.com"
                className="mt-4 inline-flex items-center gap-1.5 rounded-pill bg-fw-black px-5 py-2.5 text-[13px] font-semibold text-white"
              >
                contact@thespinr.com
              </a>
            </div>

            <div className="rounded-3xl border border-fw-border bg-white p-6">
              <MessageCircleQuestion className="h-5 w-5 text-fw-black" />
              <h2 className="mt-3 text-[16px] font-bold text-fw-text">Common questions</h2>
              <p className="mt-1.5 text-[13px] leading-[21px] text-fw-darkGray">
                Photo tips, themes, pricing — the short answers live in the FAQ.
              </p>
              <Link
                href="/#faq"
                className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-fw-text underline-offset-4 hover:underline"
              >
                Read the FAQ <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
