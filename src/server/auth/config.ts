import { type DefaultSession, type NextAuthConfig } from "next-auth";

import { env } from "~/env";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      /** Whether the identity provider put this person in the admin group at sign-in. */
      admin: boolean;
    } & DefaultSession["user"];
  }
}

// Any OpenID Connect provider. The AUTH_AUTHENTIK_* names are the older spelling and still work.
const issuer = env.AUTH_OIDC_ISSUER ?? env.AUTH_AUTHENTIK_ISSUER;
const clientId = env.AUTH_OIDC_CLIENT_ID ?? env.AUTH_AUTHENTIK_ID;
const clientSecret = env.AUTH_OIDC_CLIENT_SECRET ?? env.AUTH_AUTHENTIK_SECRET;
const legacy = !env.AUTH_OIDC_ISSUER && Boolean(env.AUTH_AUTHENTIK_ISSUER);

/**
 * The Auth.js provider id. The callback URL to register at the provider is
 * `<LOCKBOX_ADMIN_URL>/api/auth/callback/<id>`. The older AUTH_AUTHENTIK_* settings keep `authentik`,
 * so a provider set up before the rename needs no change.
 */
export const PROVIDER_ID = env.AUTH_OIDC_PROVIDER_ID ?? (legacy ? "authentik" : "oidc");

/** The name on the sign-in button. */
export const PROVIDER_NAME = env.AUTH_OIDC_NAME ?? (legacy ? "Authentik" : "single sign-on");

/** The group that may use the admin page, and the claim in the ID token or profile that lists groups. */
export const ADMIN_GROUP = env.AUTH_OIDC_ADMIN_GROUP;
const GROUPS_CLAIM = env.AUTH_OIDC_GROUPS_CLAIM;

export const signInEnabled = Boolean(issuer && clientId && clientSecret);

/** Whether the profile's groups claim, a list or a single name, includes the admin group. */
export function inAdminGroup(profile: Record<string, unknown> | undefined, claim = GROUPS_CLAIM, group = ADMIN_GROUP) {
  const groups = profile?.[claim];
  return Array.isArray(groups) ? groups.includes(group) : groups === group;
}

/** Secure cookies need HTTPS. A plain-HTTP admin URL, such as localhost, gets plain cookies. */
const adminUrl = env.LOCKBOX_ADMIN_URL ?? (env.LOCKBOX_PUBLIC_URL ? undefined : "http://localhost:3000");

export const authConfig = {
  providers: signInEnabled
    ? [
        {
          id: PROVIDER_ID,
          name: PROVIDER_NAME,
          type: "oidc",
          issuer,
          clientId,
          clientSecret,
          // Authentik's profile scope carries `groups`. Other providers may need a `groups` scope here.
          authorization: { params: { scope: env.AUTH_OIDC_SCOPE } },
        },
      ]
    : [],
  // A TLS proxy in front forwards the host that was asked for. The middleware allows only the configured ones.
  trustHost: true,
  useSecureCookies: process.env.NODE_ENV === "production" && !adminUrl?.startsWith("http://"),
  session: { strategy: "jwt", maxAge: 7 * 86_400 },
  pages: { signIn: "/signin", signOut: "/signin?signout", error: "/signin" },
  callbacks: {
    // A person outside the group never gets a session, even if the provider lets them through.
    signIn: ({ profile }) => inAdminGroup(profile),
    jwt: ({ token, profile }) => {
      if (profile) token.admin = inAdminGroup(profile);
      return token;
    },
    session: ({ session, token }) => ({ ...session, user: { ...session.user, admin: token.admin === true } }),
  },
} satisfies NextAuthConfig;
