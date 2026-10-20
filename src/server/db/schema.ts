import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * One locked share. `pin` and `items` are sealed with LOCKBOX_KEY and the share's id, so a copy of
 * the database file alone opens nothing, and a sealed value moved to another row does not open there.
 */
export const shares = sqliteTable("shares", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  pin: text("pin").notNull(),
  items: text("items").notNull(),
  itemCount: integer("item_count").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  views: integer("views").notNull().default(0),
  lastViewedAt: integer("last_viewed_at", { mode: "timestamp_ms" }),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: integer("locked_until", { mode: "timestamp_ms" }),
});

export type ShareRow = typeof shares.$inferSelect;
