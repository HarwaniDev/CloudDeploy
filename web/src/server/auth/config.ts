import { type DefaultSession, type NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";

import { db } from "~/server/db";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      username?: string;
      avatarUrl?: string;
      accessToken?: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }
}

export const authConfig = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: { scope: "read:user user:email" },
      },
    }),
  ],
  secret: process.env.AUTH_SECRET,
  callbacks: {
    async jwt({ token, account, profile, user }) {
      if (account?.provider === "github") {
        token.accessToken = account.access_token;
        // Profile is GitHub user JSON on first sign-in
        const ghProfile = profile as unknown as {
          id?: number | string;
          login?: string;
          email?: string | null;
          avatar_url?: string;
        } | undefined;

        token.username = ghProfile?.login ?? (user as any)?.name ?? token.name ?? undefined;
        token.email = ghProfile?.email ?? (user as any)?.email ?? token.email ?? undefined;
        token.avatarUrl = ghProfile?.avatar_url ?? (user as any)?.image ?? (token as any).picture ?? undefined;
        token.githubId = ghProfile?.id ? String(ghProfile.id) : token.githubId;

        // Persist or update user in our database
        try {
          const githubId = (((token as any).githubId ?? undefined) as string | undefined);
          const email = (((token as any).email ?? undefined) as string | undefined);

          // Try to find an existing user by githubId first, fallback by email
          let dbUser = githubId
            ? await db.user.findUnique({ where: { githubId: githubId! } })
            : null;
          if (!dbUser && email) {
            dbUser = await db.user.findUnique({ where: { email: email! } });
          }

          if (!dbUser) {
            dbUser = await db.user.create({
              data: {
                githubId: (githubId as string | null | undefined) ?? null,
                githubUsername: (((token as any).username as string | undefined) ?? null),
                email: (email as string | null | undefined) ?? null,
                avatarUrl: (((token as any).avatarUrl as string | undefined) ?? null),
              },
            });
          } else {
            // Keep profile info fresh
            dbUser = await db.user.update({
              where: { id: dbUser.id },
              data: {
                githubUsername: ((((token as any).username as string | undefined) ?? dbUser.githubUsername) ?? null),
                avatarUrl: ((((token as any).avatarUrl as string | undefined) ?? dbUser.avatarUrl) ?? null),
                email: ((email ?? dbUser.email) ?? null),
                githubId: ((githubId ?? dbUser.githubId) ?? null),
              },
            });
          }

          (token as any).dbUserId = dbUser.id;
        } catch {
          // Swallow to avoid breaking login; app can handle missing db link
        }
      }
      return token;
    },
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: ((token as any).dbUserId as string | undefined) ?? token.sub ?? (session.user as any)?.id,
        username: (token as any).username,
        email: (token as any).email ?? session.user?.email,
        avatarUrl: (token as any).avatarUrl ?? (session.user as any)?.avatarUrl ?? session.user?.image,
        accessToken: (token as any).accessToken,
      },
    }),
  },
} satisfies NextAuthConfig;
