import { count, desc, eq, gt, lt } from "drizzle-orm";

import { Item, NewShare } from "~/domain/share";
import { generateId, generatePin, open, sameSecret, seal } from "./crypto";
import { type Db } from "./db/open";
import { shares } from "./db/schema";

const DAY = 86_400_000;
/** Wrong PINs in a row before a share locks. At 73 bits the PIN is not guessable; this stops a script hammering one. */
export const MAX_ATTEMPTS = 5;
export const LOCKOUT_MS = 15 * 60_000;
/** Expired shares stay in the admin list this long, so one can still be extended, then go. */
export const PURGE_AFTER_MS = 30 * DAY;

export type Unlock =
  | { status: "ok"; title: string; items: Item[]; expiresAt: Date }
  | { status: "missing" }
  | { status: "wrong"; remaining: number }
  | { status: "locked"; until: Date };

export type ShareSummary = {
  id: string;
  title: string;
  pin: string;
  itemCount: number;
  createdAt: Date;
  expiresAt: Date;
  views: number;
  lastViewedAt: Date | null;
  lockedUntil: Date | null;
};

const pinContext = (id: string) => `lockbox/pin/${id}`;
const itemsContext = (id: string) => `lockbox/items/${id}`;

export function createShares(db: Db, key: Buffer, now: () => Date = () => new Date()) {
  const row = (id: string) => db.select().from(shares).where(eq(shares.id, id)).get();
  const readItems = (id: string, sealed: string) => Item.array().parse(JSON.parse(open(key, sealed, itemsContext(id))));

  function purge() {
    db.delete(shares)
      .where(lt(shares.expiresAt, new Date(now().getTime() - PURGE_AFTER_MS)))
      .run();
  }

  return {
    /** Stores a share and returns its id and PIN. The PIN is shown once here and on the admin page. */
    create(input: NewShare) {
      const share = NewShare.parse(input);
      purge();
      const id = generateId();
      const pin = generatePin();
      const createdAt = now();
      const expiresAt = new Date(createdAt.getTime() + share.expiresInDays * DAY);
      db.insert(shares)
        .values({
          id,
          title: share.title,
          pin: seal(key, pin, pinContext(id)),
          items: seal(key, JSON.stringify(share.items), itemsContext(id)),
          itemCount: share.items.length,
          createdAt,
          expiresAt,
        })
        .run();
      return { id, pin, expiresAt };
    },

    /**
     * Checks a PIN and returns the items only when it matches. A missing and an expired share answer
     * the same, so a guessed id says nothing. The check and the counter update are one transaction.
     */
    unlock(id: string, pin: string): Unlock {
      return db.transaction((tx) => {
        const share = tx.select().from(shares).where(eq(shares.id, id)).get();
        const at = now();
        if (!share || share.expiresAt <= at) return { status: "missing" } as const;
        if (share.lockedUntil && share.lockedUntil > at) return { status: "locked", until: share.lockedUntil } as const;
        if (!sameSecret(pin, open(key, share.pin, pinContext(id)))) {
          const failed = share.failedAttempts + 1;
          if (failed >= MAX_ATTEMPTS) {
            const until = new Date(at.getTime() + LOCKOUT_MS);
            tx.update(shares).set({ failedAttempts: 0, lockedUntil: until }).where(eq(shares.id, id)).run();
            return { status: "locked", until } as const;
          }
          tx.update(shares).set({ failedAttempts: failed }).where(eq(shares.id, id)).run();
          return { status: "wrong", remaining: MAX_ATTEMPTS - failed } as const;
        }
        tx.update(shares)
          .set({ failedAttempts: 0, lockedUntil: null, views: share.views + 1, lastViewedAt: at })
          .where(eq(shares.id, id))
          .run();
        return { status: "ok", title: share.title, items: readItems(id, share.items), expiresAt: share.expiresAt } as const;
      });
    },

    /** Every share, newest first, with its PIN. Admin only. */
    list(): ShareSummary[] {
      purge();
      return db
        .select()
        .from(shares)
        .orderBy(desc(shares.createdAt))
        .all()
        .map((s) => ({
          id: s.id,
          title: s.title,
          pin: open(key, s.pin, pinContext(s.id)),
          itemCount: s.itemCount,
          createdAt: s.createdAt,
          expiresAt: s.expiresAt,
          views: s.views,
          lastViewedAt: s.lastViewedAt,
          lockedUntil: s.lockedUntil && s.lockedUntil > now() ? s.lockedUntil : null,
        }));
    },

    /** How many shares exist and how many have not expired. No titles, ids, or PINs. */
    counts() {
      purge();
      const total = db.select({ n: count() }).from(shares).get()?.n ?? 0;
      const active = db.select({ n: count() }).from(shares).where(gt(shares.expiresAt, now())).get()?.n ?? 0;
      return { total, active };
    },

    /** The items without a PIN, for the admin preview. Expired shares open too. */
    peek(id: string) {
      const share = row(id);
      return share ? { title: share.title, items: readItems(id, share.items) } : null;
    },

    /** Moves the expiry to `days` from now, unless it is already later, and clears a lockout. */
    extend(id: string, days: number) {
      const share = row(id);
      if (!share) return null;
      const target = new Date(now().getTime() + days * DAY);
      const expiresAt = share.expiresAt > target ? share.expiresAt : target;
      db.update(shares).set({ expiresAt, lockedUntil: null, failedAttempts: 0 }).where(eq(shares.id, id)).run();
      return expiresAt;
    },

    /** Ends a lockout early, for a viewer who mistyped and asked. */
    clearLockout(id: string) {
      db.update(shares).set({ lockedUntil: null, failedAttempts: 0 }).where(eq(shares.id, id)).run();
    },

    /** A new PIN, so the old one stops working. */
    rotatePin(id: string) {
      if (!row(id)) return null;
      const pin = generatePin();
      db.update(shares)
        .set({ pin: seal(key, pin, pinContext(id)), lockedUntil: null, failedAttempts: 0 })
        .where(eq(shares.id, id))
        .run();
      return pin;
    },

    remove(id: string) {
      db.delete(shares).where(eq(shares.id, id)).run();
    },
  };
}

export type Shares = ReturnType<typeof createShares>;
