import { describe, expect, test } from "bun:test";

import { frameDocument, readHeight } from "./frame";

const headAt = (doc: string) => doc.indexOf("--background:");

describe("frame", () => {
  test("the theme goes into the real head, before the page's own styles", () => {
    const doc = frameDocument('<!doctype html><html><head><meta charset="utf-8"><style>.r{}</style></head><body>x</body></html>');
    expect(headAt(doc)).toBeGreaterThan(doc.indexOf("<head>"));
    expect(headAt(doc)).toBeLessThan(doc.indexOf(".r{}"));
  });

  test("a <head> inside a script or comment is not taken for the real one", () => {
    const doc = frameDocument('<!-- <head> --><script>var s="<head>"</script><p>x</p>');
    expect(doc.startsWith("<!doctype html><head>")).toBe(true);
  });

  test("a page without html or head still gets the theme", () => {
    expect(headAt(frameDocument("<p>x</p>"))).toBeGreaterThan(0);
    expect(frameDocument("<html><body>x</body></html>")).toContain("<html><head><meta charset");
  });

  test("only height messages are read", () => {
    expect(readHeight({ type: "lockbox/height", height: 412 })).toBe(412);
    expect(readHeight({ type: "other", height: 412 })).toBeUndefined();
    expect(readHeight({ type: "lockbox/height", height: -1 })).toBeUndefined();
    expect(readHeight("x")).toBeUndefined();
  });
});
