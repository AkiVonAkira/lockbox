import NextAuth from "next-auth";
import { cache } from "react";

import { env } from "~/env";
import { authConfig } from "./config";

const { auth: uncachedAuth, handlers, signIn, signOut } = NextAuth(authConfig);

const auth = cache(uncachedAuth);

/** `next dev` only: act as an admin without Authentik. Next inlines NODE_ENV, so a production build drops it. */
const devAdmin = process.env.NODE_ENV === "development" && Boolean(env.LOCKBOX_DEV_ADMIN);

/** Whether the request comes from a signed-in admin. */
export const isAdmin = cache(async (): Promise<boolean> => {
  if (devAdmin) return true;
  // Misconfigured Auth.js (no secret or provider) answers with an object that has no user.
  const session = await auth();
  return session?.user?.admin === true;
});

export { auth, handlers, signIn, signOut };
