"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { type Item } from "~/domain/share";
import { frameDocument, readHeight } from "../_lib/frame";

const MIN_HEIGHT = 80;
const MAX_HEIGHT = 20_000;

/**
 * One framed item. The frame runs the page's scripts but has an opaque origin (no
 * allow-same-origin), so the page cannot read this page, its cookies, or call Lockbox as the viewer.
 */
function HtmlFrame({ item }: { item: Extract<Item, { kind: "html" }> }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(item.height ?? 600);
  const doc = useMemo(() => frameDocument(item.html), [item.html]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== ref.current?.contentWindow) return;
      const next = readHeight(event.data);
      if (next) setHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, next)));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <iframe
      ref={ref}
      title={item.title}
      srcDoc={doc}
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      className="block w-full border-0"
      style={{ height }}
    />
  );
}

/** When the link stops working, in the viewer's own timezone, so it renders only in the browser. */
function Expiry({ iso }: { iso: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    setText(new Date(iso).toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" }));
  }, [iso]);
  return <p className="text-muted-foreground min-h-[1.5em] text-[12px]">{text && `Available until ${text}`}</p>;
}

/**
 * A share's items, one tab each when there is more than one. Arrow keys, Home, and End move between
 * tabs. `back` is a link above the title, for the admin preview; `expiresAt` adds a line under it.
 */
export function Viewer({ title, items, expiresAt, back }: { title: string; items: Item[]; expiresAt?: string; back?: React.ReactNode }) {
  const [index, setIndex] = useState(0);
  const ids = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const item = items[index] ?? items[0];

  const select = (i: number, focus = false) => {
    const next = (i + items.length) % items.length;
    setIndex(next);
    if (focus) tabs.current[next]?.focus();
    // A new page starts at its top, not wherever the last one was scrolled to.
    window.scrollTo({ top: 0 });
  };
  const onKey = (event: React.KeyboardEvent) => {
    const to = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: items.length - 1 }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    select(to, true);
  };

  return (
    <main className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-4 pt-6 pb-16">
      <header className="flex flex-col gap-3">
        {back}
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[19px] font-semibold">{title}</h1>
          {expiresAt && <Expiry iso={expiresAt} />}
        </div>
        {items.length > 1 && (
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Pages" onKeyDown={onKey}>
            {items.map((it, i) => (
              <button
                key={i}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`${ids}-tab-${i}`}
                aria-controls={`${ids}-panel`}
                aria-selected={i === index}
                tabIndex={i === index ? 0 : -1}
                onClick={() => select(i)}
                className={i === index ? "btn btn-pri" : "btn"}
              >
                {it.title}
              </button>
            ))}
          </div>
        )}
      </header>
      {/* Keyed by tab, so switching starts the page fresh rather than reusing the last frame's height. */}
      <div
        id={`${ids}-panel`}
        role={items.length > 1 ? "tabpanel" : undefined}
        aria-labelledby={items.length > 1 ? `${ids}-tab-${index}` : undefined}
      >
        {item?.kind === "html" && <HtmlFrame key={index} item={item} />}
      </div>
    </main>
  );
}
