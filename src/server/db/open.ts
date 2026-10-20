import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { join } from "node:path";

import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

/** Opens the database file, or `:memory:`, and applies the committed migrations. */
export function openDb(file: string, migrationsFolder = join(process.cwd(), "drizzle")): Db {
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder });
  return db;
}
