import { NewShare } from "~/domain/share";
import { env } from "~/env";
import { sameSecret } from "~/server/crypto";
import { sharesStore } from "~/server/db";
import { shareUrl } from "~/server/links";

export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Creates a share for an agent. LAN only (the middleware 404s it on the public name), and only with
 * LOCKBOX_SERVICE_TOKEN as a bearer token. Answers with the link and the PIN, once.
 */
export async function POST(request: Request) {
  const token = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!env.LOCKBOX_SERVICE_TOKEN || !token || !sameSecret(token, env.LOCKBOX_SERVICE_TOKEN)) {
    return json({ error: "unauthorized" }, 401);
  }
  const body: unknown = await request.json().catch(() => null);
  const parsed = NewShare.safeParse(body);
  if (!parsed.success) return json({ error: "invalid", issues: parsed.error.issues.slice(0, 5) }, 400);
  const { id, pin, expiresAt } = sharesStore().create(parsed.data);
  return json({ id, url: shareUrl(id), pin, expiresAt: expiresAt.toISOString() }, 201);
}
