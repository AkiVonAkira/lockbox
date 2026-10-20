import { describe, expect, test } from "bun:test";

import { requestOrigin, servedOn } from "./hosts";

const headers = (host: string, forwarded?: string) => new Headers({ host, ...(forwarded ? { "x-forwarded-host": forwarded } : {}) });

describe("hosts", () => {
  test("lockbox.internal and lockbox.kayzel.com are HTTPS origins, and nothing else is", () => {
    expect(requestOrigin(headers("lockbox.internal"))).toBe("https://lockbox.internal");
    expect(requestOrigin(headers("lockbox.kayzel.com", "lockbox.kayzel.com"))).toBe("https://lockbox.kayzel.com");
    expect(requestOrigin(headers("lockbox.kayzel.com", "lockbox.internal"))).toBeNull();
    expect(requestOrigin(headers("todo.kayzel.com"))).toBeNull();
    expect(requestOrigin(headers("lockbox.kayzel.com.evil.com"))).toBeNull();
    expect(requestOrigin(headers("localhost:3000"))).toBeNull();
    expect(requestOrigin(headers("localhost:3000"), true)).toBe("http://localhost:3000");
  });

  test("the public name serves only the PIN pages", () => {
    const pub = "https://lockbox.kayzel.com";
    for (const path of ["/", "/s/AAAAAAAAAAAAAAAAAAAAAA", "/api/s/AAAAAAAAAAAAAAAAAAAAAA/unlock", "/icon.svg"]) {
      expect([path, servedOn(pub, path)]).toEqual([path, true]);
    }
    for (const path of [
      "/admin",
      "/admin/view/x",
      "/signin",
      "/signin/authentik",
      "/api/auth/callback/authentik",
      "/api/shares",
      "/api/s/x/unlock/more",
      "/s/x/y",
      "/anything",
    ]) {
      expect([path, servedOn(pub, path)]).toEqual([path, false]);
      expect([path, servedOn("https://lockbox.internal", path)]).toEqual([path, true]);
    }
  });
});
