import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    // Optional so a build needs no credentials. Without the secret, issuer, client id, and client secret,
    // nobody can sign in to the admin page.
    AUTH_SECRET: z.string().optional(),
    AUTH_OIDC_ISSUER: z.string().url().optional(),
    AUTH_OIDC_CLIENT_ID: z.string().optional(),
    AUTH_OIDC_CLIENT_SECRET: z.string().optional(),
    AUTH_OIDC_PROVIDER_ID: z.string().regex(/^[a-z0-9-]+$/).optional(),
    AUTH_OIDC_NAME: z.string().optional(),
    AUTH_OIDC_SCOPE: z.string().default("openid profile"),
    AUTH_OIDC_GROUPS_CLAIM: z.string().default("groups"),
    AUTH_OIDC_ADMIN_GROUP: z.string().default("Admin"),
    // The older names for the issuer, client id, and client secret. Used when the AUTH_OIDC_* ones are unset.
    AUTH_AUTHENTIK_ID: z.string().optional(),
    AUTH_AUTHENTIK_SECRET: z.string().optional(),
    AUTH_AUTHENTIK_ISSUER: z.string().url().optional(),
    LOCKBOX_DATA_DIR: z.string().default(".data"),
    // 32 random bytes, base64. Seals every PIN and every item at rest. Unset, a key is made once in the data directory.
    LOCKBOX_KEY: z.string().optional(),
    // The credential for POST /api/shares on the admin URL. Without it, uploads are refused.
    LOCKBOX_SERVICE_TOKEN: z.string().min(32).optional(),
    // A read-only credential for GET /api/stats on the admin URL. Without it, stats are refused.
    LOCKBOX_STATS_TOKEN: z.string().min(32).optional(),
    // Where viewers open shares, and where the admin page answers. See src/server/auth/hosts.ts.
    LOCKBOX_PUBLIC_URL: z.string().url().optional(),
    LOCKBOX_ADMIN_URL: z.string().url().optional(),
    LOCKBOX_DEV_ADMIN: z.string().optional(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  },
  client: {},
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_OIDC_ISSUER: process.env.AUTH_OIDC_ISSUER,
    AUTH_OIDC_CLIENT_ID: process.env.AUTH_OIDC_CLIENT_ID,
    AUTH_OIDC_CLIENT_SECRET: process.env.AUTH_OIDC_CLIENT_SECRET,
    AUTH_OIDC_PROVIDER_ID: process.env.AUTH_OIDC_PROVIDER_ID,
    AUTH_OIDC_NAME: process.env.AUTH_OIDC_NAME,
    AUTH_OIDC_SCOPE: process.env.AUTH_OIDC_SCOPE,
    AUTH_OIDC_GROUPS_CLAIM: process.env.AUTH_OIDC_GROUPS_CLAIM,
    AUTH_OIDC_ADMIN_GROUP: process.env.AUTH_OIDC_ADMIN_GROUP,
    AUTH_AUTHENTIK_ID: process.env.AUTH_AUTHENTIK_ID,
    AUTH_AUTHENTIK_SECRET: process.env.AUTH_AUTHENTIK_SECRET,
    AUTH_AUTHENTIK_ISSUER: process.env.AUTH_AUTHENTIK_ISSUER,
    LOCKBOX_DATA_DIR: process.env.LOCKBOX_DATA_DIR,
    LOCKBOX_KEY: process.env.LOCKBOX_KEY,
    LOCKBOX_SERVICE_TOKEN: process.env.LOCKBOX_SERVICE_TOKEN,
    LOCKBOX_STATS_TOKEN: process.env.LOCKBOX_STATS_TOKEN,
    LOCKBOX_PUBLIC_URL: process.env.LOCKBOX_PUBLIC_URL,
    LOCKBOX_ADMIN_URL: process.env.LOCKBOX_ADMIN_URL,
    LOCKBOX_DEV_ADMIN: process.env.LOCKBOX_DEV_ADMIN,
    NODE_ENV: process.env.NODE_ENV,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
