import "server-only";

import { mkdirSync } from "node:fs";
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

/** The share store. Throws when LOCKBOX_KEY is missing or the wrong length. */
export function sharesStore() {
  store.lockboxShares ??= createShares(db(), readKey(env.LOCKBOX_KEY));
  return store.lockboxShares;
}
