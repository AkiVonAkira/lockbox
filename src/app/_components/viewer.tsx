"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

/** A share's items, one tab each when there is more than one. */
export function Viewer({ title, items }: { title: string; items: Item[] }) {
  const [index, setIndex] = useState(0);
  const item = items[index] ?? items[0];

  return (
    <main className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-4 pt-6 pb-16">
      <header className="flex flex-col gap-3">
        <h1 className="text-[19px] font-semibold">{title}</h1>
        {items.length > 1 && (
          <nav className="flex flex-wrap gap-1.5" aria-label="Pages">
            {items.map((it, i) => (
              <button
                key={i}
                type="button"
                aria-current={i === index ? "page" : undefined}
                onClick={() => setIndex(i)}
                className={i === index ? "btn btn-pri" : "btn"}
              >
                {it.title}
              </button>
            ))}
          </nav>
        )}
      </header>
      {/* Keyed by tab, so switching starts the page fresh rather than reusing the last frame's height. */}
      {item?.kind === "html" && <HtmlFrame key={index} item={item} />}
    </main>
  );
}
