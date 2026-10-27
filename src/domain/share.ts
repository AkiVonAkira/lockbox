import { z } from "zod";

/**
 * One page of a share. Only HTML for now; another kind (an image, a file, Markdown) is another
 * member of the union, and the viewer renders each kind its own way.
 */
export const HtmlItem = z.object({
  kind: z.literal("html"),
  title: z.string().trim().min(1).max(200),
  html: z.string().min(1).max(5_000_000),
  // T3's html_render height, the frame's height until the page reports its own.
  height: z.number().int().min(80).max(2000).optional(),
});

export const Item = z.discriminatedUnion("kind", [HtmlItem]);
export type Item = z.infer<typeof Item>;

export const DEFAULT_TTL_DAYS = 30;

export const NewShare = z.object({
  title: z.string().trim().min(1).max(200),
  items: z.array(Item).min(1).max(50),
  expiresInDays: z.number().int().min(1).max(365).default(DEFAULT_TTL_DAYS),
});
export type NewShare = z.input<typeof NewShare>;

/** A share id from a URL: 16 bytes in base64url. Anything else is not looked up. */
export const ShareId = z.string().regex(/^[A-Za-z0-9_-]{22}$/);

/** A share as one Discord message: the link stays clickable and the PIN sits in a code block with a copy button. */
export function shareMessage(url: string, pin: string) {
  return `${url}\n\`\`\`${pin}\`\`\``;
}
