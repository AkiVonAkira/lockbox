import { sameSecret } from "./crypto";

/** A JSON answer no proxy or browser keeps. */
export const noStore = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Whether the request carries `secret` as its bearer token. An unset secret matches nothing. */
export function hasBearer(request: Request, secret: string | undefined) {
  const token = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  return Boolean(secret && token && sameSecret(token, secret));
}
