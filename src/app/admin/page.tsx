import { type Metadata } from "next";
import { redirect } from "next/navigation";

import { isAdmin } from "~/server/auth";
import { sharesStore } from "~/server/db";
import { shareUrl } from "~/server/links";
import { signOutAction } from "./actions";
import { ShareRow } from "./share-row";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shares · Lockbox" };

/** Every share with its link and PIN. Served on lockbox.internal only, to the Authentik Admin group. */
export default async function Admin() {
  if (!(await isAdmin())) redirect("/signin/authentik?callbackUrl=/admin");
  const now = Date.now();
  const shares = sharesStore()
    .list()
    .map((s) => ({
      ...s,
      url: shareUrl(s.id),
      expired: s.expiresAt.getTime() <= now,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      lastViewedAt: s.lastViewedAt?.toISOString() ?? null,
      lockedUntil: s.lockedUntil?.toISOString() ?? null,
    }));

  return (
    <main className="mx-auto flex w-full max-w-[1000px] flex-col gap-5 px-4 pt-8 pb-16">
      <header className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" width={28} height={28} />
        <h1 className="text-[19px] font-semibold">Lockbox</h1>
        <span className="text-muted-foreground text-[12.5px]">
          {shares.length} {shares.length === 1 ? "share" : "shares"}
        </span>
        <form action={signOutAction} className="ml-auto">
          <button type="submit" className="btn">
            Sign out
          </button>
        </form>
      </header>
      {shares.length === 0 ? (
        <p className="text-muted-foreground text-[13px]">No shares yet. Ask an agent to lock a visual.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {shares.map((share) => (
            <ShareRow key={share.id} share={share} />
          ))}
        </ul>
      )}
    </main>
  );
}
