"use client";

import { Check, Search, TriangleAlert } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { type AdminShare, ShareRow } from "./share-row";

/** Search shows once the list is long enough to need it. */
const SEARCH_FROM = 6;

/** The cards and the one toast they share. It stays mounted when the list empties, so the last action's toast still shows. */
export function ShareList({ shares, empty }: { shares: AdminShare[]; empty: string }) {
  const [message, setMessage] = useState<{ text: string; failed: boolean } | null>(null);
  const [query, setQuery] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const notify = useCallback((text: string, failed = false) => {
    setMessage({ text, failed });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), failed ? 4000 : 1600);
  }, []);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? shares.filter((s) => s.title.toLowerCase().includes(q)) : shares;
  }, [shares, query]);

  return (
    <>
      {(shares.length >= SEARCH_FROM || query) && (
        <label className="inset max-w-[320px] py-1.5">
          <Search size={13} aria-hidden className="text-muted-foreground shrink-0" />
          <input
            type="search"
            className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
            placeholder="Search titles"
            aria-label="Search titles"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      )}
      {shown.length === 0 ? (
        <p className="text-muted-foreground text-[13px]">{shares.length === 0 ? empty : "No titles match."}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {shown.map((share) => (
            <ShareRow key={share.id} share={share} notify={notify} />
          ))}
        </ul>
      )}
      <div role="status" aria-live="polite" className={`toast ${message ? "toast-on" : ""}`}>
        {message && (
          <>
            {message.failed ? (
              <TriangleAlert size={14} aria-hidden className="text-destructive" />
            ) : (
              <Check size={14} aria-hidden className="text-[var(--ok)]" />
            )}
            {message.text}
          </>
        )}
      </div>
    </>
  );
}
