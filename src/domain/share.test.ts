import { describe, expect, test } from "bun:test";

import { shareMessage } from "./share";

describe("shareMessage", () => {
  test("puts the link on its own line and the PIN in a code block", () => {
    expect(shareMessage("https://lockbox.example.com/s/abc", "abc*DEF_123")).toBe(
      "https://lockbox.example.com/s/abc\n```abc*DEF_123```",
    );
  });
});
