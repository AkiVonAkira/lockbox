import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    // Optional so a build needs no credentials. Without all three, nobody can sign in to the admin page.
    AUTH_SECRET: z.string().optional(),
    AUTH_AUTHENTIK_ID: z.string().optional(),
    AUTH_AUTHENTIK_SECRET: z.string().optional(),
    AUTH_AUTHENTIK_ISSUER: z.string().url().optional(),
    LOCKBOX_DATA_DIR: z.string().default(".data"),
    // 32 random bytes, base64. Seals every PIN and every item at rest. Without it, nothing opens.
    LOCKBOX_KEY: z.string().optional(),
    // The agents' credential for POST /api/shares on lockbox.internal. Without it, uploads are refused.
    LOCKBOX_SERVICE_TOKEN: z.string().min(32).optional(),
    // Where the links Lockbox hands out point. Defaults to https://lockbox.kayzel.com in src/server/links.ts.
    LOCKBOX_PUBLIC_URL: z.string().url().optional(),
    LOCKBOX_DEV_ADMIN: z.string().optional(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  },
  client: {},
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_AUTHENTIK_ID: process.env.AUTH_AUTHENTIK_ID,
    AUTH_AUTHENTIK_SECRET: process.env.AUTH_AUTHENTIK_SECRET,
    AUTH_AUTHENTIK_ISSUER: process.env.AUTH_AUTHENTIK_ISSUER,
    LOCKBOX_DATA_DIR: process.env.LOCKBOX_DATA_DIR,
    LOCKBOX_KEY: process.env.LOCKBOX_KEY,
    LOCKBOX_SERVICE_TOKEN: process.env.LOCKBOX_SERVICE_TOKEN,
    LOCKBOX_PUBLIC_URL: process.env.LOCKBOX_PUBLIC_URL,
    LOCKBOX_DEV_ADMIN: process.env.LOCKBOX_DEV_ADMIN,
    NODE_ENV: process.env.NODE_ENV,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
