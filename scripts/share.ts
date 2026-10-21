// Locks pages in Lockbox and prints the link and PIN: `bun scripts/share.ts <manifest.json>`.
//
// The manifest is { "title": "...", "expiresInDays"?: 30, "items": [{ "title": "...", "file": "page.html", "height"?: 900 }] }.
// Files are relative to the manifest. A T3 html_render attachment (~/.t3/userdata/attachments/<thread>-<id>-html.html)
// works as is: the theme and script T3 adds to it are taken out, and Lockbox adds its own.
//
// It posts to LOCKBOX_API, https://lockbox.internal by default, which is LAN only. The token is LOCKBOX_SERVICE_TOKEN from
// the environment, or from the infra checkout's ignored .env (INFRA_DIR, or ~/Projects/infra). It is never printed.
// The lab CA for lockbox.internal is LOCKBOX_CA, or the infra checkout's copy of Caddy's root.
//
// Bun loads the working directory's .env files into the environment before this runs. In this checkout those are the
// dev server's settings, whose LOCKBOX_SERVICE_TOKEN is not the deployed one, so a value that came from them is ignored.
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

/** The files Bun reads into process.env from the working directory. */
const BUN_DOTENV = [".env", ".env.local", ".env.development", ".env.production", ".env.test", ".env.development.local", ".env.production.local", ".env.test.local"];

/** A variable set in the shell, or undefined when it is unset or Bun took it from a dotenv file in the working directory. */
function shellEnv(name: string) {
  const value = process.env[name];
  if (!value) return undefined;
  return BUN_DOTENV.some((file) => readEnvValue(join(process.cwd(), file), name) === value) ? undefined : value;
}

function infraDir() {
  const candidates = [shellEnv("INFRA_DIR"), join(homedir(), "Projects", "infra"), join(homedir(), "Projects", "Infra"), "C:/Projects/Infra"];
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

  const api = shellEnv("LOCKBOX_API") ?? "https://lockbox.internal";
  const infra = infraDir();
  const envFile = shellEnv("LOCKBOX_ENV_FILE");
  const token =
    shellEnv("LOCKBOX_SERVICE_TOKEN") ??
    (envFile ? readEnvValue(envFile, "LOCKBOX_SERVICE_TOKEN") : undefined) ??
    (infra ? readEnvValue(join(infra, ".env"), "LOCKBOX_SERVICE_TOKEN") : undefined);
  if (!token) throw new Error("No LOCKBOX_SERVICE_TOKEN in the environment or the infra .env");
  const caFile = shellEnv("LOCKBOX_CA") ?? (infra ? join(infra, "hosts/apps/projects/coolify/caddy-root.crt") : undefined);
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
