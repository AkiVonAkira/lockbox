/**
 * Builds the document for one framed HTML item, as T3's html_render frames it
 * (packages/shared/src/htmlRender.ts in t3code): the theme as CSS variables on :root, T3's base
 * stylesheet, and a script that reports the page's height so the frame fits it. Pages written for
 * T3 read those variables with fallbacks, so they render here as they did in the thread. The colors
 * are Stillwater's, Lockbox's own theme, under T3's names.
 */

const VARIABLES: Record<string, string> = {
  "--background": "#1d2021",
  "--foreground": "#ebdbb2",
  "--muted": "#222526",
  "--muted-foreground": "#8f8f99",
  "--card": "#222526",
  "--card-foreground": "#ebdbb2",
  "--popover": "#1a1c1d",
  "--popover-foreground": "#ebdbb2",
  "--secondary": "#3c3836",
  "--secondary-foreground": "#ebdbb2",
  "--border": "#3c3836",
  "--input": "#3c3836",
  "--ring": "#5aa8b4",
  "--primary": "#5aa8b4",
  "--primary-foreground": "#1d2021",
  "--accent": "#5aa8b4",
  "--accent-foreground": "#1d2021",
  "--accent-surface": "#2a3436",
  "--accent-surface-foreground": "#ebdbb2",
  "--destructive": "#f44747",
  "--destructive-foreground": "#ff6b6b",
  "--destructive-surface": "#3a1d1d",
  "--warning": "#d9c679",
  "--warning-foreground": "#e6d690",
  "--warning-surface": "#3a3520",
  "--success": "#10b981",
  "--success-foreground": "#34d399",
  "--info": "#3b82f6",
  "--info-foreground": "#60a5fa",
  "--code-background": "#1a1c1d",
  "--code-foreground": "#ebdbb2",
  "--chart-1": "#5aa8b4",
  "--chart-2": "#fbbf24",
  "--chart-3": "#c084fc",
  "--chart-4": "#fb7185",
  "--chart-5": "#a3e635",
  "--chart-6": "#2dd4bf",
  "--radius": "0.625rem",
  "--font-sans": '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  "--font-mono": '"SF Mono", "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace',
};

const BASE_CSS =
  "html{background:var(--background);color:var(--foreground);font-family:var(--font-sans);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%;scrollbar-width:none}" +
  "html::-webkit-scrollbar{display:none}body{margin:0}code,kbd,pre,samp{font-family:var(--font-mono)}";

/** The message a frame posts to the viewer with its content height. */
export const HEIGHT_MESSAGE = "lockbox/height";

// Reports the page's height whenever it changes, and opens http(s) links in a new tab rather than
// inside the frame. The page's own later :root rules still win over the variables.
const SCRIPT = `(function(){var h;function z(){var r=document.documentElement,v=Math.ceil(r.scrollHeight>r.clientHeight?r.scrollHeight:r.getBoundingClientRect().height);if(v===h)return;h=v;parent.postMessage({type:${JSON.stringify(HEIGHT_MESSAGE)},height:v},"*");}if(window.ResizeObserver){var o=new ResizeObserver(z);o.observe(document.documentElement);document.addEventListener("DOMContentLoaded",function(){if(document.body)o.observe(document.body);});}document.addEventListener("DOMContentLoaded",z);window.addEventListener("load",z);document.addEventListener("click",function(e){var l=e.target&&e.target.closest&&e.target.closest("a[href]");if(l&&/^https?:/i.test(l.href)){l.target="_blank";l.rel="noopener noreferrer";}},true);})();`;

const HEAD =
  '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
  `<style>:root{color-scheme:dark;${Object.entries(VARIABLES)
    .map(([k, v]) => `${k}:${v};`)
    .join("")}}${BASE_CSS}</style><script>${SCRIPT}</script>`;

/**
 * Comments and raw-text elements blanked to the same length, so a `<head>` inside a script string or
 * a comment is never taken for the real one and offsets still line up.
 */
const blankNonMarkup = (html: string) =>
  html.replace(/<!--[\s\S]*?(?:-->|$)|<(script|style|textarea|title|template|noscript)\b[\s\S]*?(?:<\/\1\s*>|$)/gi, (m) => " ".repeat(m.length));

/**
 * The offset just past the first `<name>` or `<name ...>` open tag, or -1. A linear scan: only the
 * first start can match, because a `>` after any later start is also after the first one. A regex
 * like `<head(?:\s[^>]*)?>` rescans from every start and is quadratic on `<head ` repeated.
 */
const openTagEnd = (scan: string, name: string) => {
  const start = new RegExp(`<${name}(?=[\\s>])`, "i").exec(scan);
  if (!start) return -1;
  const close = scan.indexOf(">", start.index + name.length + 1);
  return close === -1 ? -1 : close + 1;
};

/** The page with Lockbox's head inserted first, so the page's own styles come after and win. */
export function frameDocument(html: string): string {
  const scan = blankNonMarkup(html);
  const head = openTagEnd(scan, "head");
  if (head !== -1) return html.slice(0, head) + HEAD + html.slice(head);
  const root = openTagEnd(scan, "html");
  if (root !== -1) return `${html.slice(0, root)}<head>${HEAD}</head>${html.slice(root)}`;
  const doctype = /^\s*<!doctype[^>]*>/i.exec(html);
  if (doctype) return `${html.slice(0, doctype[0].length)}<head>${HEAD}</head>${html.slice(doctype[0].length)}`;
  return `<!doctype html><head>${HEAD}</head>${html}`;
}

/** A height a frame reported, if `data` is one. */
export function readHeight(data: unknown): number | undefined {
  if (typeof data !== "object" || data === null) return undefined;
  const { type, height } = data as Record<string, unknown>;
  return type === HEIGHT_MESSAGE && typeof height === "number" && Number.isFinite(height) && height > 0 ? height : undefined;
}
