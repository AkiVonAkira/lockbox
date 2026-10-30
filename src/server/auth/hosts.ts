/**
 * The origins Lockbox answers on, from two settings:
 *
 * - `LOCKBOX_PUBLIC_URL`: where viewers open shares. It serves only the PIN pages.
 * - `LOCKBOX_ADMIN_URL`: where the admin page, sign-in, and the upload and stats APIs answer. Keep it
 *   off the internet if you can. It may be the same URL as the public one, which serves everything there.
 *
 * With neither set, both are http://localhost:3000. With only the public URL set, there is no admin
 * origin: the admin page and uploads answer nowhere, so a missing setting never opens them to viewers.
 *
 * The scheme comes from the URL, not from the request, because a TLS proxy in front hands the
 * container plain HTTP.
 */
export type Origins = { public: string[]; admin: string[] };

const LOCAL = "http://localhost:3000";

const originOf = (url: string | undefined) => {
  if (!url) return undefined;
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
};

/** Reads the origins from the environment. */
export function originsFromEnv(env: Record<string, string | undefined> = process.env): Origins {
  const pub = originOf(env.LOCKBOX_PUBLIC_URL);
  const admin = originOf(env.LOCKBOX_ADMIN_URL);
  if (!pub && !admin) return { public: [LOCAL], admin: [LOCAL] };
  return { public: pub ? [pub] : [], admin: admin ? [admin] : [] };
}

let cached: Origins | undefined;
const configured = () => (cached ??= originsFromEnv());

/**
 * All the public origin serves: the landing page, a share's PIN page, its unlock call, and the icon.
 * The admin page, sign-in, and the upload API exist only on the admin origin. An allowlist, so a route
 * added later stays private until it is named here.
 */
const PUBLIC_PATHS = /^\/(?:|s\/[A-Za-z0-9_-]+|api\/s\/[A-Za-z0-9_-]+\/unlock|icon\.svg)$/;

/** Whether a path is served on this origin. Loopback under `next dev` counts as an admin origin. */
export const servedOn = (origin: string, path: string, origins = configured()) =>
  !origins.public.includes(origin) || origins.admin.includes(origin) || PUBLIC_PATHS.test(path);

/** Whether this origin is a public one, where the landing page says less. */
export const isPublic = (origin: string, origins = configured()) => origins.public.includes(origin);

/** `next dev` on this machine, over HTTP, on whatever port it was given. */
const LOOPBACK = /^(?:127\.0\.0\.1|localhost|\[::1\]):\d{1,5}$/;

/**
 * The origin a request was made to, or null when Lockbox does not answer on that host. Every host
 * the request names, `Host` and each `X-Forwarded-Host`, must be the same configured host, so a
 * forged or unfamiliar host never reaches Auth.js. `dev` adds loopback.
 */
export function requestOrigin(headers: Headers, dev = false, origins = configured()): string | null {
  const named = [headers.get("host"), ...(headers.get("x-forwarded-host")?.split(",") ?? [])]
    .filter((h): h is string => h !== null)
    .map((h) => h.trim().toLowerCase());
  const host = named[0];
  if (!host || named.some((h) => h !== host)) return null;
  const match = [...origins.admin, ...origins.public].find((o) => new URL(o).host === host);
  if (match) return match;
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

/** The origin the share links Lockbox hands out point at: the public one, or the admin one when there is none. */
export const linkOrigin = (origins = configured()) => origins.public[0] ?? origins.admin[0] ?? LOCAL;
