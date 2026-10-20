import { describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";

import { PIN_ALPHABET, PIN_LENGTH, generateId, generatePin, open, readKey, sameSecret, seal } from "./crypto";

describe("crypto", () => {
  test("a PIN is 12 characters from the alphabet, with an upper, a lower, a digit, and a symbol", () => {
    for (let i = 0; i < 500; i++) {
      const pin = generatePin();
      expect(pin).toHaveLength(PIN_LENGTH);
      expect([...pin].every((c) => PIN_ALPHABET.includes(c))).toBe(true);
      expect(pin).toMatch(/[A-Z]/);
      expect(pin).toMatch(/[a-z]/);
      expect(pin).toMatch(/[0-9]/);
      expect(pin).toMatch(/[^A-Za-z0-9]/);
      expect(pin).not.toMatch(/[IlO0o1'"`\\ <>]/);
    }
  });

  test("ids are 22 URL-safe characters and do not repeat", () => {
    const ids = new Set(Array.from({ length: 1000 }, generateId));
    expect(ids.size).toBe(1000);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  test("sealed text opens only with the same key and context", () => {
    const key = randomBytes(32);
    const sealed = seal(key, "Ab3$cd", "lockbox/pin/x");
    expect(sealed).not.toContain("Ab3$cd");
    expect(open(key, sealed, "lockbox/pin/x")).toBe("Ab3$cd");
    expect(() => open(key, sealed, "lockbox/pin/y")).toThrow();
    expect(() => open(randomBytes(32), sealed, "lockbox/pin/x")).toThrow();
    const [v, iv, body, tag] = sealed.split(".");
    const flipped = Buffer.from(body!, "base64url");
    flipped[0]! ^= 1;
    expect(() => open(key, [v, iv, flipped.toString("base64url"), tag].join("."), "lockbox/pin/x")).toThrow();
  });

  test("the key must be 32 bytes", () => {
    expect(() => readKey(undefined)).toThrow();
    expect(() => readKey(randomBytes(16).toString("base64"))).toThrow();
    expect(readKey(randomBytes(32).toString("base64"))).toHaveLength(32);
  });

  test("secrets compare by value", () => {
    expect(sameSecret("a", "a")).toBe(true);
    expect(sameSecret("a", "ab")).toBe(false);
  });
});
