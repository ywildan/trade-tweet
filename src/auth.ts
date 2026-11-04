import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Twitter from "next-auth/providers/twitter";
import type { Provider } from "next-auth/providers";
import type { JWT } from "next-auth/jwt";

import { prisma } from "@/lib/db";
import { enabledOAuthProviders } from "@/lib/oauth";
import { verifyPassword } from "@/lib/password";
import { ensureOAuthUser } from "@/lib/users";
import { loginSchema } from "@/lib/validation";

const { google: googleEnabled, twitter: twitterEnabled } =
  enabledOAuthProviders;

const providers: Provider[] = [
  Credentials({
    name: "Email dan password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const parsed = loginSchema.safeParse(credentials);
      if (!parsed.success) return null;

      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          role: true,
          avatarUrl: true,
          passwordHash: true,
        },
      });
      if (!user?.passwordHash) return null;

      const valid = await verifyPassword(
        parsed.data.password,
        user.passwordHash,
      );
      if (!valid) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        role: user.role,
        image: user.avatarUrl,
      };
    },
  }),
];

if (googleEnabled) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  );
}

if (twitterEnabled) {
  providers.push(
    Twitter({
      clientId: process.env.X_CLIENT_ID!,
      clientSecret: process.env.X_CLIENT_SECRET!,
    }),
  );
}

const dbUserSelect = {
  id: true,
  email: true,
  name: true,
  username: true,
  role: true,
  avatarUrl: true,
} as const;

function applyUserToToken(
  token: JWT,
  user: {
    id: string;
    email: string;
    name: string;
    username: string;
    role: string;
    avatarUrl: string | null;
  },
) {
  token.id = user.id;
  token.email = user.email;
  token.name = user.name;
  token.username = user.username;
  token.role = user.role;
  token.picture = user.avatarUrl;
}

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login", error: "/login" },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (!account || account.provider === "credentials") return true;

      // X/Twitter OAuth 2 tidak mengirim email. Pakai email sintetis stabil
      // per akun provider agar user tetap punya baris unik di DB.
      const email =
        user.email?.toLowerCase() ??
        `${account.provider}-${account.providerAccountId}@oauth.spmtrade.local`;

      const dbUser = await ensureOAuthUser({
        email,
        name: user.name,
        image: user.image,
        usernameHint: user.name,
      });

      user.id = dbUser.id;
      user.email = email;
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email.toLowerCase() },
          select: dbUserSelect,
        });
        if (dbUser) applyUserToToken(token, dbUser);
        return token;
      }

      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: dbUserSelect,
        });
        if (dbUser) applyUserToToken(token, dbUser);
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id;
      if (token.username) session.user.username = token.username;
      if (token.role) session.user.role = token.role;
      if (typeof token.name === "string") session.user.name = token.name;
      if (typeof token.email === "string") session.user.email = token.email;
      session.user.image =
        typeof token.picture === "string" ? token.picture : null;
      return session;
    },
  },
});
