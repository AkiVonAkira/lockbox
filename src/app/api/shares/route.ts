import { NewShare } from "~/domain/share";
import { env } from "~/env";
import { sharesStore } from "~/server/db";
import { hasBearer, noStore as json } from "~/server/http";
import { shareUrl } from "~/server/links";

export const dynamic = "force-dynamic";

/**
 * Creates a share for an agent. Admin URL only (the middleware 404s it on the public URL), and only with
 * LOCKBOX_SERVICE_TOKEN as a bearer token. Answers with the link and the PIN, once.
 */
export async function POST(request: Request) {
  if (!hasBearer(request, env.LOCKBOX_SERVICE_TOKEN)) return json({ error: "unauthorized" }, 401);
  const body: unknown = await request.json().catch(() => null);
  const parsed = NewShare.safeParse(body);
  if (!parsed.success) return json({ error: "invalid", issues: parsed.error.issues.slice(0, 5) }, 400);
  const { id, pin, expiresAt } = sharesStore().create(parsed.data);
  return json({ id, url: shareUrl(id), pin, expiresAt: expiresAt.toISOString() }, 201);
}
