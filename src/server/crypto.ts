import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

// Characters that read alike in most fonts (I l 1, O o 0) and ones that break when pasted into a
// shell or a chat (quotes, backslash, space, angle brackets) are left out.
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!#$%&*+-=?@^_~";
const CLASSES = [UPPER, LOWER, DIGITS, SYMBOLS];
export const PIN_ALPHABET = CLASSES.join("");
export const PIN_LENGTH = 12;

/**
 * A 12-character PIN with at least one of each class, drawn uniformly from the PINs that have all
 * four, about 73 bits. Redrawing keeps the draw uniform where patching a character in would not.
 */
export function generatePin(): string {
  for (;;) {
    const pin = Array.from({ length: PIN_LENGTH }, () => PIN_ALPHABET[randomInt(PIN_ALPHABET.length)]).join("");
    if (CLASSES.every((set) => [...pin].some((c) => set.includes(c)))) return pin;
  }
}

/** 128 random bits, URL-safe. The share id is a second secret next to the PIN. */
export const generateId = () => randomBytes(16).toString("base64url");

/** Compares two secrets in constant time, whatever their lengths. */
export function sameSecret(a: string, b: string) {
  const digest = (s: string) => createHash("sha256").update(s, "utf8").digest();
  return timingSafeEqual(digest(a), digest(b));
}

/** LOCKBOX_KEY, which must decode to exactly 32 bytes. */
export function readKey(base64: string | undefined): Buffer {
  const key = Buffer.from(base64 ?? "", "base64");
  if (key.length !== 32) throw new Error("LOCKBOX_KEY must be 32 random bytes, base64");
  return key;
}

const VERSION = "v1";

/** AES-256-GCM. `context` is authenticated, not stored: the same context is needed to open it. */
export function seal(key: Buffer, plaintext: string, context: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(context, "utf8"));
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [VERSION, iv, body, cipher.getAuthTag()].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

/** The plaintext, or a thrown error when the key, the context, or the sealed text is wrong. */
export function open(key: Buffer, sealed: string, context: string): string {
  const [version, iv, body, tag] = sealed.split(".");
  if (version !== VERSION || !iv || body === undefined || !tag) throw new Error("Not a sealed value");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(context, "utf8"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
}
