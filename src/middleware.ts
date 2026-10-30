import { NextResponse, type NextRequest } from "next/server";

import { requestOrigin, sameOriginWrite, servedOn } from "~/server/auth/hosts";

const dev = process.env.NODE_ENV === "development";

/**
 * Answers only on LOCKBOX_ADMIN_URL and LOCKBOX_PUBLIC_URL, so Auth.js, which builds sign-in and callback
 * URLs from the forwarded host and scheme when AUTH_URL is unset, only ever sees those. A TLS proxy may
 * hand the container plain HTTP, so this also sets the scheme the browser used. The public URL
 * serves only the PIN pages. Every write but the upload API must come from the page's own origin;
 * the upload API reads only a bearer token, never a cookie.
 */
export function middleware(request: NextRequest) {
  const origin = requestOrigin(request.headers, dev);
  if (!origin) return new NextResponse("Unknown host\n", { status: 400 });
  const path = request.nextUrl.pathname;
  if (!servedOn(origin, path)) return new NextResponse("Not found\n", { status: 404 });
  if (path !== "/api/shares" && !sameOriginWrite(request.method, request.headers, origin)) {
    return new NextResponse("Cross-origin write refused\n", { status: 403 });
  }
  const { host, protocol } = new URL(origin);
  const headers = new Headers(request.headers);
  headers.set("host", host);
  headers.set("x-forwarded-host", host);
  headers.set("x-forwarded-proto", protocol.slice(0, -1));
  return NextResponse.next({ request: { headers } });
}

// Everything but the readiness check, which Docker asks on 127.0.0.1, and build assets.
export const config = { runtime: "nodejs", matcher: ["/((?!api/healthz|_next/static).*)"] };
