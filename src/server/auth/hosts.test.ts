import { describe, expect, test } from "bun:test";

import { originsFromEnv, requestOrigin, servedOn } from "./hosts";

const headers = (host: string, forwarded?: string) => new Headers({ host, ...(forwarded ? { "x-forwarded-host": forwarded } : {}) });

const split = originsFromEnv({ LOCKBOX_PUBLIC_URL: "https://share.example.com", LOCKBOX_ADMIN_URL: "https://lockbox.internal" });

describe("hosts", () => {
  test("only the configured origins answer, with the scheme from the setting", () => {
    expect(requestOrigin(headers("lockbox.internal"), false, split)).toBe("https://lockbox.internal");
    expect(requestOrigin(headers("share.example.com", "share.example.com"), false, split)).toBe("https://share.example.com");
    expect(requestOrigin(headers("share.example.com", "lockbox.internal"), false, split)).toBeNull();
    expect(requestOrigin(headers("other.example.com"), false, split)).toBeNull();
    expect(requestOrigin(headers("share.example.com.evil.com"), false, split)).toBeNull();
    expect(requestOrigin(headers("localhost:3000"), false, split)).toBeNull();
    expect(requestOrigin(headers("localhost:3000"), true, split)).toBe("http://localhost:3000");
  });

  test("the public origin serves only the PIN pages", () => {
    const pub = "https://share.example.com";
    for (const path of ["/", "/s/AAAAAAAAAAAAAAAAAAAAAA", "/api/s/AAAAAAAAAAAAAAAAAAAAAA/unlock", "/icon.svg"]) {
      expect([path, servedOn(pub, path, split)]).toEqual([path, true]);
    }
    for (const path of [
      "/admin",
      "/admin/view/x",
      "/signin",
      "/signin/oidc",
      "/api/auth/callback/oidc",
      "/api/shares",
      "/api/stats",
      "/api/s/x/unlock/more",
      "/s/x/y",
      "/anything",
    ]) {
      expect([path, servedOn(pub, path, split)]).toEqual([path, false]);
      expect([path, servedOn("https://lockbox.internal", path, split)]).toEqual([path, true]);
    }
  });

  test("with nothing set, localhost:3000 serves everything", () => {
    const local = originsFromEnv({});
    expect(requestOrigin(headers("localhost:3000"), false, local)).toBe("http://localhost:3000");
    expect(servedOn("http://localhost:3000", "/admin", local)).toBe(true);
  });

  test("with only the public URL set, nothing serves the admin page", () => {
    const pubOnly = originsFromEnv({ LOCKBOX_PUBLIC_URL: "https://share.example.com" });
    expect(pubOnly.admin).toEqual([]);
    expect(servedOn("https://share.example.com", "/admin", pubOnly)).toBe(false);
    expect(servedOn("https://share.example.com", "/api/shares", pubOnly)).toBe(false);
  });

  test("one URL for both serves everything on it", () => {
    const one = originsFromEnv({ LOCKBOX_PUBLIC_URL: "https://lockbox.example.com", LOCKBOX_ADMIN_URL: "https://lockbox.example.com/" });
    expect(servedOn("https://lockbox.example.com", "/admin", one)).toBe(true);
  });
});
