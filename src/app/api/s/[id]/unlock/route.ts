import { z } from "zod";

import { ShareId } from "~/domain/share";
import { sharesStore } from "~/server/db";

export const dynamic = "force-dynamic";

const Body = z.object({ pin: z.string().min(1).max(64) });

const json = (body: unknown, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** The only route that returns a share's items, and only for the right PIN. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = ShareId.safeParse((await params).id);
  if (!id.success) return json({ error: "missing" }, 404);
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return json({ error: "invalid" }, 400);
  const result = sharesStore().unlock(id.data, body.data.pin);
  switch (result.status) {
    case "ok":
      return json({ title: result.title, items: result.items }, 200);
    case "missing":
      return json({ error: "missing" }, 404);
    case "wrong":
      return json({ error: "wrong", remaining: result.remaining }, 401);
    case "locked":
      return json({ error: "locked", until: result.until.toISOString() }, 429);
  }
}
