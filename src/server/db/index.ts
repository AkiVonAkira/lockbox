import "server-only";

import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { env } from "~/env";
import { readKey } from "~/server/crypto";
import { createShares, type Shares } from "~/server/shares";
import { type Db, openDb } from "./open";

const store = globalThis as unknown as { lockboxDb?: Db; lockboxShares?: Shares };

/** Opens the database once per process. */
export function db() {
  if (!store.lockboxDb) {
    mkdirSync(env.LOCKBOX_DATA_DIR, { recursive: true });
    store.lockboxDb = openDb(join(env.LOCKBOX_DATA_DIR, "lockbox.db"));
  }
  return store.lockboxDb;
}

/**
 * LOCKBOX_KEY, or with it unset, a key made once and kept in `lockbox.key` beside the database. The
 * file is for a quick start: anyone with the data directory can then open every share. Set
 * LOCKBOX_KEY, and keep it apart from the data and its backups, to keep them sealed.
 */
function sealingKey() {
  if (env.LOCKBOX_KEY) return readKey(env.LOCKBOX_KEY);
  mkdirSync(env.LOCKBOX_DATA_DIR, { recursive: true });
  const file = join(env.LOCKBOX_DATA_DIR, "lockbox.key");
  if (!existsSync(file)) {
    writeFileSync(file, randomBytes(32).toString("base64"), { mode: 0o600, flag: "wx" });
    console.warn(`LOCKBOX_KEY is unset: made a key in ${file}. Set LOCKBOX_KEY to keep the key apart from the data.`);
  }
  return readKey(readFileSync(file, "utf8").trim());
}

/** The share store. Throws when LOCKBOX_KEY or the key file is the wrong length. */
export function sharesStore() {
  store.lockboxShares ??= createShares(db(), sealingKey());
  return store.lockboxShares;
}
