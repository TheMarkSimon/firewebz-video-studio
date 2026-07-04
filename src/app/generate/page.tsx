import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/session-store";
import { GenerateClient } from "@/components/generate-client";
import Link from "next/link";

type SP = Record<string, string | string[] | undefined>;

export default async function GeneratePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const sessionId = typeof sp.session === "string" ? sp.session : undefined;

  if (!sessionId) {
    return <NotFound message="No session. Please start from onboarding." />;
  }

  const session = await getSession(sessionId);
  if (!session) {
    return <NotFound message="Your session expired. Start a new post." />;
  }

  return (
    <AppShell>
      <GenerateClient
        sessionId={sessionId}
        businessName={session.businessName}
        category={session.category}
        photos={{
          front: session.productPhotos?.front ?? null,
          back: session.productPhotos?.back ?? null,
          left: session.productPhotos?.left ?? null,
          right: session.productPhotos?.right ?? null,
        }}
      />
    </AppShell>
  );
}

function NotFound({ message }: { message: string }) {
  return (
    <AppShell>
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="font-display text-[28px] font-bold text-fw-text">Session not found</h1>
        <p className="mt-2 text-[15px] text-fw-darkGray">{message}</p>
        <Link href="/onboarding" className="mt-6 inline-block rounded-pill bg-fw-purple px-6 py-3 text-[14px] font-semibold text-white">
          Start a new post
        </Link>
      </div>
    </AppShell>
  );
}
