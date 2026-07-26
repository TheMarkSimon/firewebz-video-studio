"use client";

// Support chat widget, env-activated (no-op until an ID is set — same
// dormant-until-configured pattern as lib/email.ts):
//   NEXT_PUBLIC_CHATBASE_ID — Chatbase AI chatbot (chatbase.co)
//   NEXT_PUBLIC_CRISP_ID    — Crisp live chat (crisp.chat), used if no Chatbase
// Unanswered/escalated conversations are routed to contact@thespinr.com in
// the provider's dashboard settings — see docs/support-chat.md.
// NEXT_PUBLIC_* is baked at BUILD time: adding the ID needs a redeploy.

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const CHATBASE_ID = process.env.NEXT_PUBLIC_CHATBASE_ID;
const CRISP_ID = process.env.NEXT_PUBLIC_CRISP_ID;

// Never on merchant storefronts (/embed iframes) or inside the Shopify
// admin app — the widget is for OUR site visitors only.
const EXCLUDED = ["/embed", "/shopify"];

export function SupportChat() {
  const pathname = usePathname();
  const excluded = EXCLUDED.some((p) => pathname?.startsWith(p));
  useEffect(() => {
    if (excluded) return;
    if (CHATBASE_ID) {
      if (document.querySelector("script[data-spinr-chat]")) return;
      // Chatbase's embed reads the chatbot id from the script tag's id
      // attribute (current convention) — older builds read
      // window.embeddedChatbotConfig / chatbotId attribute. Provide all.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).embeddedChatbotConfig = { chatbotId: CHATBASE_ID, domain: "www.chatbase.co" };
      const s = document.createElement("script");
      s.id = CHATBASE_ID;
      s.src = "https://www.chatbase.co/embed.min.js";
      s.setAttribute("chatbotId", CHATBASE_ID);
      s.setAttribute("domain", "www.chatbase.co");
      s.setAttribute("data-spinr-chat", "1");
      s.defer = true;
      document.body.appendChild(s);
      return;
    }
    if (CRISP_ID) {
      if (document.getElementById("spinr-crisp")) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      w.$crisp = w.$crisp ?? [];
      w.CRISP_WEBSITE_ID = CRISP_ID;
      const s = document.createElement("script");
      s.id = "spinr-crisp";
      s.src = "https://client.crisp.chat/l.js";
      s.async = true;
      document.body.appendChild(s);
    }
  }, [excluded]);

  return null;
}
