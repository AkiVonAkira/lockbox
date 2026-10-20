import { describe, expect, test } from "bun:test";

import { readFilter, shareStatus, span } from "./status";

const now = Date.UTC(2026, 9, 20, 12);
const at = (ms: number) => new Date(now + ms);
const MIN = 60_000;
const DAY = 24 * 60 * MIN;

describe("span", () => {
  test("rounds down to the largest unit", () => {
    expect(span(30_000)).toBe("under a minute");
    expect(span(12 * MIN)).toBe("12 min");
    expect(span(-5 * 60 * MIN)).toBe("5 h");
    expect(span(DAY)).toBe("1 day");
    expect(span(29.5 * DAY)).toBe("29 days");
  });
});

describe("shareStatus", () => {
  test("counts the days left", () => {
    expect(shareStatus({ expiresAt: at(29.5 * DAY), lockedUntil: null }, now)).toEqual({ kind: "ok", label: "29 days left" });
  });
  test("a live lockout wins, a past one does not", () => {
    expect(shareStatus({ expiresAt: at(DAY * 3), lockedUntil: at(12 * MIN) }, now)).toEqual({
      kind: "locked",
      label: "Locked for 12 min",
    });
    expect(shareStatus({ expiresAt: at(DAY * 3), lockedUntil: at(-MIN) }, now).kind).toBe("ok");
  });
  test("expiry wins over a lockout", () => {
    expect(shareStatus({ expiresAt: at(-2 * DAY), lockedUntil: at(MIN) }, now)).toEqual({
      kind: "expired",
      label: "Expired 2 days ago",
    });
    expect(shareStatus({ expiresAt: at(0), lockedUntil: null }, now).kind).toBe("expired");
  });
});

test("readFilter falls back to active", () => {
  expect(readFilter("expired")).toBe("expired");
  expect(readFilter(["all"])).toBe("active");
  expect(readFilter(undefined)).toBe("active");
});
