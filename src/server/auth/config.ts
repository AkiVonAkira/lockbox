import { type DefaultSession, type NextAuthConfig } from "next-auth";
import Authentik from "next-auth/providers/authentik";

import { env } from "~/env";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      /** Whether Authentik put this person in the Admin group at sign-in. */
      admin: boolean;
    } & DefaultSession["user"];
  }
}

/** The Authentik group that may use the admin page. The application is bound to it too. */
export const ADMIN_GROUP = "Admin";

export const signInEnabled = Boolean(env.AUTH_AUTHENTIK_ID && env.AUTH_AUTHENTIK_SECRET && env.AUTH_AUTHENTIK_ISSUER);

export const authConfig = {
  providers: signInEnabled
    ? [
        Authentik({
          clientId: env.AUTH_AUTHENTIK_ID,
          clientSecret: env.AUTH_AUTHENTIK_SECRET,
          issuer: env.AUTH_AUTHENTIK_ISSUER,
          // Authentik's profile scope carries `groups`.
          authorization: { params: { scope: "openid profile" } },
        }),
      ]
    : [],
  // Caddy terminates TLS and Coolify's proxy forwards the host that was asked for.
  trustHost: true,
  useSecureCookies: process.env.NODE_ENV === "production",
  session: { strategy: "jwt", maxAge: 7 * 86_400 },
  pages: { signIn: "/signin", signOut: "/signin?signout", error: "/signin" },
  callbacks: {
    // A person outside the group never gets a session, even if the Authentik binding were removed.
    signIn: ({ profile }) => Array.isArray(profile?.groups) && profile.groups.includes(ADMIN_GROUP),
    jwt: ({ token, profile }) => {
      if (profile) token.admin = Array.isArray(profile.groups) && profile.groups.includes(ADMIN_GROUP);
      return token;
    },
    session: ({ session, token }) => ({ ...session, user: { ...session.user, admin: token.admin === true } }),
  },
} satisfies NextAuthConfig;
