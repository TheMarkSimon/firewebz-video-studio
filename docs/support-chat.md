# Support chat setup (Chatbase — free tier)

The site already ships the loader (`src/components/support-chat.tsx`,
mounted in the root layout, excluded from /embed and /shopify). It's
dormant until an env var is set.

## Founder steps (~10 min)

1. Sign up at chatbase.co with marksimanduyev@gmail.com (never the work
   email). Free plan is enough to start.
2. Create an agent → "Import from website" → add https://thespinr.com
   (it crawls the marketing page + FAQ; also paste docs/listing-copy.md
   content as extra training text if offered).
3. Settings → Leads / Escalation: set the fallback so unanswered
   questions collect the visitor's email and forward the conversation to
   contact@thespinr.com. (Chatbase: "Collect leads" + email
   notifications → add contact@thespinr.com.)
4. Copy the agent/chatbot ID (Settings → Embed — the `chatbotId` value).
5. Tell the agent (Claude) the ID, or run:
   printf 'THE_ID' | npx vercel env add NEXT_PUBLIC_CHATBASE_ID production
   then redeploy (NEXT_PUBLIC_* is baked at build time).

## Alternative: Crisp (free live chat, human-first)

Same loader supports it: set NEXT_PUBLIC_CRISP_ID to the Crisp Website ID
instead. Crisp free = live inbox + email forwarding when offline; Chatbase
free = AI answers with small monthly credit limit. Chatbase preferred per
founder decision 2026-07 (AI-first, email fallback).
