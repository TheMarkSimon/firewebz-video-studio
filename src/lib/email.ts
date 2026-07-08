// Transactional email via Resend's REST API (plain fetch — no SDK dep).
//
// Config (Vercel env, add via CLI — the dashboard silently saves empty
// strings for sensitive vars):
//   RESEND_API_KEY — required to actually send; when unset we log and no-op
//                    so generation NEVER fails because email is unconfigured.
//   EMAIL_FROM     — verified sender. Until thespinr.com is verified in
//                    Resend (DNS records at GoDaddy), the fallback
//                    onboarding@resend.dev only delivers to the Resend
//                    account owner's inbox — fine for beta testing.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

const BRAND_TEXT = "#101012";
const BRAND_LIME = "#D7FC47"; // fills only; always black text on top

interface SendArgs {
  to: string;
  subject: string;
  html: string;
}

async function send({ to, subject, html }: SendArgs): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping email to", to);
    return false;
  }
  const from = process.env.EMAIL_FROM ?? "Spinr <onboarding@resend.dev>";
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[email] Resend error", res.status, (await res.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] Resend request failed:", err);
    return false;
  }
}

// Shared shell: monochrome, near-black text, generous whitespace. Inline
// styles only — email clients strip <style> blocks.
function layout(bodyHtml: string): string {
  return (
    `<div style="margin:0;padding:32px 16px;background:#ffffff;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:${BRAND_TEXT};">` +
    `<div style="max-width:520px;margin:0 auto;">` +
    `<p style="margin:0 0 28px;font-size:20px;font-weight:800;letter-spacing:-0.02em;">Spinr</p>` +
    bodyHtml +
    `<p style="margin:36px 0 0;font-size:12px;color:#8a8a8f;">Spinr — turn the photos you already have into 360° spins.<br/>` +
    `Questions? Just reply to this email.</p>` +
    `</div></div>`
  );
}

function button(href: string, label: string): string {
  return (
    `<a href="${href}" style="display:inline-block;background:${BRAND_LIME};color:#000000;` +
    `font-size:15px;font-weight:700;text-decoration:none;padding:13px 28px;border-radius:999px;">` +
    `${label}</a>`
  );
}

export async function sendSpinReadyEmail(args: {
  to: string;
  spinTitle: string;
  spinUrl: string;
}): Promise<boolean> {
  const title = escapeHtml(args.spinTitle);
  return send({
    to: args.to,
    subject: `Your 360° spin is ready — ${args.spinTitle}`,
    html: layout(
      `<h1 style="margin:0 0 12px;font-size:26px;line-height:32px;letter-spacing:-0.02em;">Your 360° spin is ready.</h1>` +
      `<p style="margin:0 0 24px;font-size:15px;line-height:23px;color:#3c3c43;">` +
      `<strong>${title}</strong> finished rendering. Drag it around, then copy the ` +
      `one-line snippet to put it on your product page.</p>` +
      `<p style="margin:0 0 8px;">${button(args.spinUrl, "View my spin")}</p>`,
    ),
  });
}

export async function sendSpinFailedEmail(args: {
  to: string;
  spinTitle: string;
  retryUrl: string;
}): Promise<boolean> {
  const title = escapeHtml(args.spinTitle);
  return send({
    to: args.to,
    subject: `We hit a snag with your spin — ${args.spinTitle}`,
    html: layout(
      `<h1 style="margin:0 0 12px;font-size:26px;line-height:32px;letter-spacing:-0.02em;">That one didn't come out right.</h1>` +
      `<p style="margin:0 0 24px;font-size:15px;line-height:23px;color:#3c3c43;">` +
      `Generation for <strong>${title}</strong> failed on our side — you weren't charged ` +
      `anything and your photos are safe. One click to try again.</p>` +
      `<p style="margin:0 0 8px;">${button(args.retryUrl, "Try again")}</p>`,
    ),
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
