import { describe, expect, test } from "bun:test";

import { stripT3 } from "./share";

// The head T3's html_render writes into an attachment, cut down to the parts stripT3 matches.
const T3_HEAD =
  '<style id="t3-theme">:root{--background:#fff}</style><script>(function(){var s=document.getElementById("t3-theme");s.dataset.x=1;})();</script>';

describe("stripT3", () => {
  test("removes T3's theme style and its bootstrap script, and nothing else", () => {
    const page = `<!doctype html><html><head>${T3_HEAD}<style>p{color:red}</style></head><body><p>hi</p></body></html>`;
    expect(stripT3(page)).toBe("<!doctype html><html><head><style>p{color:red}</style></head><body><p>hi</p></body></html>");
  });

  test("leaves a page without T3's head as it is", () => {
    const page = "<p>plain</p><script>(function(){})()</script>";
    expect(stripT3(page)).toBe(page);
  });
});
