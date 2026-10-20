import { sharesStore } from "~/server/db";

export const dynamic = "force-dynamic";

/**
 * Readiness. Open to anyone on any host, so it says only that the server answers. It opens the
 * database and reads LOCKBOX_KEY first, so an image whose SQLite binding does not load, a data
 * directory it cannot write, or a missing key never counts as ready.
 */
export function GET() {
  sharesStore();
  return new Response("ok\n", { headers: { "Cache-Control": "no-store", "Content-Type": "text/plain" } });
}
