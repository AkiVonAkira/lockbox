"use client";

import { useCallback, useEffect, useState } from "react";

import { type Item } from "~/domain/share";
import { Viewer } from "./viewer";

type State =
  | { step: "pin"; message?: string }
  | { step: "busy" }
  | { step: "locked"; until: number }
  | { step: "open"; title: string; items: Item[]; expiresAt?: string }
  | { step: "gone" };

/** Time left in a lockout, to the minute, so the alert changes once a minute and not every tick. */
const wait = (ms: number) => (ms < 60_000 ? "under a minute" : `${Math.ceil(ms / 60_000)} min`);

/** Ticks once a second while a lockout runs, and hands the form back when it ends. */
function useLockout(state: State, release: () => void) {
  const [now, setNow] = useState(() => Date.now());
  const until = state.step === "locked" ? state.until : null;
  useEffect(() => {
    if (until === null) return;
    const tick = () => {
      const at = Date.now();
      setNow(at);
      if (at >= until) release();
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [until, release]);
  return until === null ? null : until - now;
}

/** Asks for the PIN, and only then fetches the share. The page itself carries nothing of it. */
export function Unlock({ id }: { id: string }) {
  const [state, setState] = useState<State>({ step: "pin" });
  const [pin, setPin] = useState("");
  const release = useCallback(() => setState({ step: "pin" }), []);
  const left = useLockout(state, release);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!pin) return;
    setState({ step: "busy" });
    const response = await fetch(`/api/s/${id}/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: pin.trim() }),
    }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as
      { title: string; items: Item[]; expiresAt?: string } | { error: string; remaining?: number; until?: string } | null;
    if (response?.ok && body && "items" in body) {
      setPin("");
      setState({ step: "open", title: body.title, items: body.items, expiresAt: body.expiresAt });
      document.title = `${body.title} · Lockbox`;
    } else if (response?.status === 404) {
      setState({ step: "gone" });
    } else if (response?.status === 401 && body && "remaining" in body) {
      setPin("");
      setState({ step: "pin", message: `Wrong PIN. ${body.remaining} ${body.remaining === 1 ? "try" : "tries"} left before it locks.` });
    } else if (response?.status === 429 && body && "until" in body && body.until) {
      setPin("");
      setState({ step: "locked", until: new Date(body.until).getTime() });
    } else {
      setState({ step: "pin", message: "Lockbox did not answer. Try again." });
    }
  }

  if (state.step === "open") return <Viewer title={state.title} items={state.items} expiresAt={state.expiresAt} />;
  const locked = state.step === "locked";

  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <form onSubmit={submit} className="glass flex w-full max-w-[340px] flex-col gap-4 px-7 pt-8 pb-7">
        <div className="flex flex-col items-center gap-1 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" width={44} height={44} />
          <h1 className="mt-2 text-[19px] font-semibold">Locked</h1>
          <p className="text-muted-foreground text-[12.5px]">
            {state.step === "gone" ? "This link has expired or does not exist." : "Enter the PIN you were given with this link."}
          </p>
        </div>
        {state.step !== "gone" && (
          <>
            <input
              className="field font-mono tracking-[.12em]"
              aria-label="PIN"
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={64}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
            {state.step === "pin" && state.message && (
              <p role="alert" className="notice">
                {state.message}
              </p>
            )}
            {locked && left !== null && (
              <p role="alert" className="notice">
                Too many wrong PINs. Try again in {wait(left)}.
              </p>
            )}
            <button type="submit" className="btn btn-pri py-2 text-[13px]" disabled={state.step === "busy" || !pin}>
              {state.step === "busy" ? "Opening…" : "Open"}
            </button>
          </>
        )}
      </form>
    </main>
  );
}
