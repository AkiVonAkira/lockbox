/**
 * The names Lockbox is served on. Each is HTTPS in the browser: Caddy on Edge, or Cloudflare for the
 * tunnel, terminates TLS, and Coolify's proxy reaches the container over HTTP, so the scheme the app
 * sees is not the one the browser used.
 */
export const HTTPS_HOSTS = ["lockbox.internal", "lockbox.kayzel.com"];

/** Reachable from the internet through the Cloudflare Tunnel. */
const PUBLIC_HOSTS = ["lockbox.kayzel.com"];

/**
 * All the public name serves: the landing page, a share's PIN page, its unlock call, and the icon.
 * The admin page, sign-in, and the upload API exist only on lockbox.internal. An allowlist, so a route
 * added later stays private until it is named here.
 */
const PUBLIC_PATHS = /^\/(?:|s\/[A-Za-z0-9_-]+|api\/s\/[A-Za-z0-9_-]+\/unlock|icon\.svg)$/;

/** Whether a path is served on this origin. */
export const servedOn = (origin: string, path: string) => !PUBLIC_HOSTS.includes(new URL(origin).hostname) || PUBLIC_PATHS.test(path);

/** Whether this origin is the public name, where the landing page says less. */
export const isPublic = (origin: string) => PUBLIC_HOSTS.includes(new URL(origin).hostname);

/** `next dev` on this machine, over HTTP, on whatever port it was given. */
const LOOPBACK = /^(?:127\.0\.0\.1|localhost|\[::1\]):\d{1,5}$/;

/**
 * The origin a request was made to, or null when Lockbox does not answer on that host. Every host
 * the request names, `Host` and each `X-Forwarded-Host`, must be the same allowed name, without a
 * port, so a forged or unfamiliar host never reaches Auth.js. `dev` adds loopback.
 */
export function requestOrigin(headers: Headers, dev = false): string | null {
  const named = [headers.get("host"), ...(headers.get("x-forwarded-host")?.split(",") ?? [])]
    .filter((h): h is string => h !== null)
    .map((h) => h.trim().toLowerCase());
  const host = named[0];
  if (!host || named.some((h) => h !== host)) return null;
  if (HTTPS_HOSTS.includes(host)) return `https://${host}`;
  if (dev && LOOPBACK.test(host)) return `http://${host}`;
  return null;
}

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

/** A write counts only when the browser says it came from the page's own origin. */
export function sameOriginWrite(method: string, headers: Headers, origin: string) {
  return SAFE.has(method.toUpperCase()) || headers.get("origin") === origin;
}

/** A path on this site to return to after sign-in, or `/admin` for anything that could leave it. */
export function returnPath(raw: string | null | undefined) {
  return raw?.startsWith("/") && !/^\/[/\\]/.test(raw) ? raw : "/admin";
}
