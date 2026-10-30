import { env } from "~/env";
import { sharesStore } from "~/server/db";
import { hasBearer, noStore } from "~/server/http";

export const dynamic = "force-dynamic";

/**
 * Share counts for a dashboard tile. Admin URL only (the middleware 404s it on the public URL), and only with
 * LOCKBOX_STATS_TOKEN as a bearer token. That token reads counts and nothing else, so it cannot upload.
 */
export function GET(request: Request) {
  if (!hasBearer(request, env.LOCKBOX_STATS_TOKEN)) return noStore({ error: "unauthorized" }, 401);
  return noStore(sharesStore().counts());
}
