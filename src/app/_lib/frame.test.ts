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

  test("a head or html tag with attributes, any case, gets the theme right after it", () => {
    const doc = frameDocument('<HTML lang="en"><HEAD\n data-x="1"><title>t</title></HEAD><body>x</body></HTML>');
    expect(doc.startsWith('<HTML lang="en"><HEAD\n data-x="1"><meta charset')).toBe(true);
    expect(frameDocument('<html lang="en"><body>x</body></html>')).toStartWith('<html lang="en"><head><meta charset');
  });

  test("a <header> is not taken for the head, and an unclosed head falls back to html", () => {
    expect(frameDocument("<html><body><header>x</header></body></html>")).toStartWith("<html><head><meta charset");
    expect(frameDocument("<p>x</p><head ")).toStartWith("<!doctype html><head><meta charset");
    expect(frameDocument("<!doctype html><p>x</p>")).toStartWith("<!doctype html><head><meta charset");
  });

  test("repeated unclosed head or html tags take linear time", () => {
    for (const tag of ["<head ", "<html "]) {
      const start = performance.now();
      frameDocument(tag.repeat(100000));
      expect(performance.now() - start).toBeLessThan(100);
    }
  });

  test("only height messages are read", () => {
    expect(readHeight({ type: "lockbox/height", height: 412 })).toBe(412);
    expect(readHeight({ type: "other", height: 412 })).toBeUndefined();
    expect(readHeight({ type: "lockbox/height", height: -1 })).toBeUndefined();
    expect(readHeight("x")).toBeUndefined();
  });
});
