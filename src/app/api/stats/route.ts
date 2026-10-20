import { env } from "~/env";
import { sameSecret } from "~/server/crypto";
import { sharesStore } from "~/server/db";

export const dynamic = "force-dynamic";

/**
 * Share counts for Astrarium's tile. LAN only (the middleware 404s it on the public name), and only with
 * LOCKBOX_STATS_TOKEN as a bearer token. That token reads counts and nothing else, so it cannot upload.
 */
export function GET(request: Request) {
  const token = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!env.LOCKBOX_STATS_TOKEN || !token || !sameSecret(token, env.LOCKBOX_STATS_TOKEN)) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json(sharesStore().counts(), { headers: { "Cache-Control": "no-store" } });
}
