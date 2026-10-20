"use client";

import { Check } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { type AdminShare, ShareRow } from "./share-row";

/** The cards and the one toast they share. It stays mounted when the list empties, so the last action's toast still shows. */
export function ShareList({ shares, empty }: { shares: AdminShare[]; empty: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const notify = useCallback((text: string) => {
    setMessage(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 1600);
  }, []);

  return (
    <>
      {shares.length === 0 ? (
        <p className="text-muted-foreground text-[13px]">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {shares.map((share) => (
            <ShareRow key={share.id} share={share} notify={notify} />
          ))}
        </ul>
      )}
      <div role="status" aria-live="polite" className={`toast ${message ? "toast-on" : ""}`}>
        {message && (
          <>
            <Check size={14} aria-hidden className="text-[var(--ok)]" />
            {message}
          </>
        )}
      </div>
    </>
  );
}
