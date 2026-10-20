import { describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";

import { openDb } from "./db/open";
import { shares as table } from "./db/schema";
import { LOCKOUT_MS, MAX_ATTEMPTS, PURGE_AFTER_MS, createShares } from "./shares";

const DAY = 86_400_000;

function setup() {
  const db = openDb(":memory:");
  let now = new Date("2026-10-20T12:00:00Z").getTime();
  const store = createShares(db, randomBytes(32), () => new Date(now));
  return { db, store, advance: (ms: number) => (now += ms) };
}

const page = { kind: "html" as const, title: "One", html: "<p>secret page</p>" };

describe("shares", () => {
  test("the right PIN opens the items and counts a view; the stored row holds no plaintext", () => {
    const { db, store } = setup();
    const { id, pin } = store.create({ title: "Spawning", items: [page] });
    const row = db.select().from(table).get()!;
    expect(row.pin).not.toContain(pin);
    expect(row.items).not.toContain("secret page");
    expect(store.unlock(id, pin)).toEqual({ status: "ok", title: "Spawning", items: [page] });
    expect(store.list()[0]).toMatchObject({ id, pin, views: 1 });
  });

  test("a wrong PIN returns no items, and five in a row lock the share for 15 minutes", () => {
    const { store, advance } = setup();
    const { id, pin } = store.create({ title: "t", items: [page] });
    for (let i = 1; i < MAX_ATTEMPTS; i++) expect(store.unlock(id, "nope")).toEqual({ status: "wrong", remaining: MAX_ATTEMPTS - i });
    expect(store.unlock(id, "nope").status).toBe("locked");
    // Locked: even the right PIN waits.
    expect(store.unlock(id, pin).status).toBe("locked");
    advance(LOCKOUT_MS + 1);
    expect(store.unlock(id, pin).status).toBe("ok");
  });

  test("a right PIN resets the wrong count", () => {
    const { store } = setup();
    const { id, pin } = store.create({ title: "t", items: [page] });
    for (let i = 1; i < MAX_ATTEMPTS; i++) store.unlock(id, "nope");
    expect(store.unlock(id, pin).status).toBe("ok");
    expect(store.unlock(id, "nope")).toEqual({ status: "wrong", remaining: MAX_ATTEMPTS - 1 });
  });

  test("missing and expired shares answer the same, and extend brings one back", () => {
    const { store, advance } = setup();
    const { id, pin } = store.create({ title: "t", items: [page], expiresInDays: 1 });
    expect(store.unlock("AAAAAAAAAAAAAAAAAAAAAA", pin)).toEqual({ status: "missing" });
    advance(DAY + 1);
    expect(store.unlock(id, pin)).toEqual({ status: "missing" });
    store.extend(id, 30);
    expect(store.unlock(id, pin).status).toBe("ok");
  });

  test("a new PIN replaces the old one", () => {
    const { store } = setup();
    const { id, pin } = store.create({ title: "t", items: [page] });
    const next = store.rotatePin(id)!;
    expect(next).not.toBe(pin);
    expect(store.unlock(id, pin).status).toBe("wrong");
    expect(store.unlock(id, next).status).toBe("ok");
  });

  test("expired shares are purged 30 days after expiry, and removed ones are gone", () => {
    const { store, advance } = setup();
    const old = store.create({ title: "old", items: [page], expiresInDays: 1 });
    const kept = store.create({ title: "kept", items: [page] });
    advance(DAY + PURGE_AFTER_MS + 1);
    expect(store.list().map((s) => s.id)).toEqual([kept.id]);
    expect(store.peek(old.id)).toBeNull();
    store.remove(kept.id);
    expect(store.list()).toEqual([]);
  });

  test("a sealed value copied to another row does not open there", () => {
    const { db, store } = setup();
    const a = store.create({ title: "a", items: [page] });
    const b = store.create({ title: "b", items: [{ ...page, html: "<p>b</p>" }] });
    const rowA = db.select().from(table).all().find((r) => r.id === a.id)!;
    db.update(table).set({ pin: rowA.pin }).run();
    expect(() => store.unlock(b.id, a.pin)).toThrow();
  });

  test("input is validated", () => {
    const { store } = setup();
    expect(() => store.create({ title: "", items: [page] })).toThrow();
    expect(() => store.create({ title: "t", items: [] })).toThrow();
  });
});
