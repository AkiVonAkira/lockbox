// Locks pages in Lockbox and prints the link and PIN: `bun scripts/share.ts <manifest.json>`.
//
// The manifest is { "title": "...", "expiresInDays"?: 30, "items": [{ "title": "...", "file": "page.html", "height"?: 900 }] }.
// Files are relative to the manifest. A T3 html_render attachment (~/.t3/userdata/attachments/<thread>-<id>-html.html)
// works as is: the theme and script T3 adds to it are taken out, and Lockbox adds its own.
//
// It posts to LOCKBOX_API, https://lockbox.internal by default, which is LAN only. The token is LOCKBOX_SERVICE_TOKEN from
// the environment, or from the infra checkout's ignored .env (INFRA_DIR, or ~/Projects/infra). It is never printed.
// The lab CA for lockbox.internal is LOCKBOX_CA, or the infra checkout's copy of Caddy's root.
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

/** Removes the theme style and bootstrap script T3's html_render puts after <head>. */
export function stripT3(html: string) {
  return html.replace(/<style id="t3-theme">[\s\S]*?<\/style><script>\(function\(\)\{var s=document\.getElementById\("t3-theme"\)[\s\S]*?<\/script>/, "");
}

function readEnvValue(file: string, name: string) {
  if (!existsSync(file)) return undefined;
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith(`${name}=`)) continue;
    const value = line.slice(name.length + 1).trim();
    return /^(["']).*\1$/.test(value) ? value.slice(1, -1) : value;
  }
  return undefined;
}

function infraDir() {
  const candidates = [process.env.INFRA_DIR, join(homedir(), "Projects", "infra"), join(homedir(), "Projects", "Infra"), "C:/Projects/Infra"];
  return candidates.find((d): d is string => Boolean(d && existsSync(join(d, ".git"))));
}

async function main() {
  const manifestPath = process.argv[2];
  if (!manifestPath) throw new Error("usage: bun scripts/share.ts <manifest.json>");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    title: string;
    expiresInDays?: number;
    items: { title: string; file: string; height?: number }[];
  };
  const base = dirname(resolve(manifestPath));
  const items = manifest.items.map((item) => ({
    kind: "html" as const,
    title: item.title,
    html: stripT3(readFileSync(resolve(base, item.file), "utf8")),
    ...(item.height ? { height: Math.min(2000, Math.max(80, Math.round(item.height))) } : {}),
  }));

  const api = process.env.LOCKBOX_API ?? "https://lockbox.internal";
  const infra = infraDir();
  const token =
    process.env.LOCKBOX_SERVICE_TOKEN ??
    (process.env.LOCKBOX_ENV_FILE ? readEnvValue(process.env.LOCKBOX_ENV_FILE, "LOCKBOX_SERVICE_TOKEN") : undefined) ??
    (infra ? readEnvValue(join(infra, ".env"), "LOCKBOX_SERVICE_TOKEN") : undefined);
  if (!token) throw new Error("No LOCKBOX_SERVICE_TOKEN in the environment or the infra .env");
  const caFile = process.env.LOCKBOX_CA ?? (infra ? join(infra, "hosts/apps/projects/coolify/caddy-root.crt") : undefined);
  const tls = api.startsWith("https://") && caFile && existsSync(caFile) ? { ca: readFileSync(caFile, "utf8") } : undefined;

  const response = await fetch(`${api}/api/shares`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ title: manifest.title, items, ...(manifest.expiresInDays ? { expiresInDays: manifest.expiresInDays } : {}) }),
    ...(tls ? { tls } : {}),
  } as RequestInit);
  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) throw new Error(`Lockbox answered ${response.status}: ${JSON.stringify(body)}`);
  console.log(JSON.stringify(body, null, 2));
}

if (import.meta.main) await main();
