import { NextRequest } from "next/server";

import { handlers } from "~/server/auth";
import { requestOrigin } from "~/server/auth/hosts";

const dev = process.env.NODE_ENV === "development";

/**
 * Next gives a route handler the address the server listens on as its URL. With AUTH_URL unset,
 * Auth.js takes callbacks from that URL, so this puts back the host the browser asked for, once
 * more checked against the names Lockbox answers on.
 */
const onHost = (handler: (request: NextRequest) => Promise<Response>) => (request: NextRequest) => {
  const origin = requestOrigin(request.headers, dev);
  if (!origin) return new Response("Unknown host\n", { status: 400 });
  const url = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, origin);
  return handler(new NextRequest(url, request));
};

export const GET = onHost(handlers.GET);
export const POST = onHost(handlers.POST);
