import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/db";

// Google-only sign-in, JWT sessions (no DB adapter — we upsert our own User
// row on sign-in and carry its id in the token). Shopify arrives later as a
// CONNECTION on the account, not as a login method.
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      await prisma.user.upsert({
        where: { email: user.email },
        create: { email: user.email, name: user.name, image: user.image },
        update: { name: user.name, image: user.image },
      });
      return true;
    },
    async jwt({ token }) {
      // Attach our User.id once per token so server code never needs a
      // second lookup by email.
      if (token.email && !token.userId) {
        const u = await prisma.user.findUnique({ where: { email: token.email } });
        if (u) token.userId = u.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        (session.user as { id?: string }).id = token.userId as string;
      }
      return session;
    },
  },
};

// The signed-in user's DB id, or null. Server-side only.
export async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return ((session?.user as { id?: string } | undefined)?.id) ?? null;
}

export async function getSessionUser(): Promise<{ id: string; name: string | null; image: string | null } | null> {
  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) return null;
  return { id, name: session?.user?.name ?? null, image: session?.user?.image ?? null };
}
