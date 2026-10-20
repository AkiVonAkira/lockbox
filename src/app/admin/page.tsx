import { LogOut } from "lucide-react";
import { type Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { isAdmin } from "~/server/auth";
import { sharesStore } from "~/server/db";
import { shareUrl } from "~/server/links";
import { type Filter, readFilter, shareStatus, span } from "../_lib/status";
import { signOutAction } from "./actions";
import { ShareList } from "./share-list";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shares · Lockbox" };

const FILTER_LABEL: Record<Filter, string> = { active: "Active", expired: "Expired", all: "All" };
const EMPTY: Record<Filter, string> = {
  active: "No active shares. Ask an agent to lock a visual.",
  expired: "No expired shares.",
  all: "No shares yet. Ask an agent to lock a visual.",
};

/** Every share with its link and PIN. Served on lockbox.internal only, to the Authentik Admin group. */
export default async function Admin({ searchParams }: { searchParams: Promise<{ show?: string | string[] }> }) {
  if (!(await isAdmin())) redirect("/signin/authentik?callbackUrl=/admin");
  const filter = readFilter((await searchParams).show);
  const now = Date.now();
  const all = sharesStore()
    .list()
    .map((s) => {
      const status = shareStatus(s, now);
      return {
        id: s.id,
        title: s.title,
        pin: s.pin,
        url: shareUrl(s.id),
        itemCount: s.itemCount,
        views: s.views,
        status,
        expired: status.kind === "expired",
        lastViewed: s.lastViewedAt ? `${span(now - s.lastViewedAt.getTime())} ago` : null,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        lockedUntil: s.lockedUntil?.toISOString() ?? null,
      };
    });
  const counts: Record<Filter, number> = {
    active: all.filter((s) => !s.expired).length,
    expired: all.filter((s) => s.expired).length,
    all: all.length,
  };
  const shares = filter === "all" ? all : all.filter((s) => s.expired === (filter === "expired"));

  return (
    <main className="mx-auto flex w-full max-w-[1000px] flex-col gap-5 px-4 pt-8 pb-16">
      <header className="flex flex-wrap items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" width={28} height={28} />
        <h1 className="text-[19px] font-semibold">Lockbox</h1>
        <nav aria-label="Filter shares" className="seg">
          {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => (
            <Link key={f} href={f === "active" ? "/admin" : `/admin?show=${f}`} aria-current={f === filter ? "page" : undefined}>
              {FILTER_LABEL[f]} <span className="text-muted-foreground">{counts[f]}</span>
            </Link>
          ))}
        </nav>
        <form action={signOutAction} className="ml-auto">
          <button type="submit" className="btn">
            <LogOut size={14} aria-hidden />
            Sign out
          </button>
        </form>
      </header>
      <ShareList shares={shares} empty={EMPTY[filter]} />
    </main>
  );
}
