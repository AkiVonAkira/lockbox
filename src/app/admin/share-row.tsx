"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { deleteShare, extendShare, rotatePin } from "./actions";

export type AdminShare = {
  id: string;
  title: string;
  pin: string;
  url: string;
  itemCount: number;
  createdAt: string;
  expiresAt: string;
  expired: boolean;
  views: number;
  lastViewedAt: string | null;
  lockedUntil: string | null;
};

const day = (iso: string) => new Date(iso).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn"
      onClick={() =>
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        })
      }
    >
      {copied ? "Copied" : label}
    </button>
  );
}

export function ShareRow({ share }: { share: AdminShare }) {
  const [shown, setShown] = useState(false);
  const [pending, start] = useTransition();
  const run = (action: () => Promise<void>) => start(() => action());

  return (
    <li className={`glass flex flex-col gap-2.5 px-4 py-3.5 ${share.expired ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-[14.5px] font-semibold">{share.title}</h2>
        <span className="text-muted-foreground text-[12px]">
          {share.itemCount} {share.itemCount === 1 ? "page" : "pages"} · made {day(share.createdAt)} ·{" "}
          {share.expired ? `expired ${day(share.expiresAt)}` : `expires ${day(share.expiresAt)}`} · {share.views}{" "}
          {share.views === 1 ? "view" : "views"}
          {share.lastViewedAt && `, last ${day(share.lastViewedAt)}`}
        </span>
        {share.lockedUntil && <span className="notice py-0.5 text-[12px]">Locked after wrong PINs</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <code className="text-muted-foreground min-w-0 truncate text-[12px]">{share.url}</code>
        <CopyButton text={share.url} label="Copy link" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-[13ch] font-mono text-[13px] tracking-[.12em]" aria-label="PIN">
          {shown ? share.pin : "••••••••••••"}
        </code>
        <button type="button" className="btn" onClick={() => setShown((s) => !s)}>
          {shown ? "Hide PIN" : "Show PIN"}
        </button>
        <CopyButton text={share.pin} label="Copy PIN" />
        <CopyButton text={`${share.url}\nPIN: ${share.pin}`} label="Copy both" />
        <span className="flex-1" />
        <Link href={`/admin/view/${share.id}`} className="btn">
          Open
        </Link>
        <button type="button" className="btn" disabled={pending} onClick={() => run(() => extendShare(share.id))}>
          {share.expired ? "Restore 30 days" : "Extend to 30 days"}
        </button>
        <button
          type="button"
          className="btn"
          disabled={pending}
          onClick={() => confirm("Give this share a new PIN? The old PIN stops working.") && run(() => rotatePin(share.id))}
        >
          New PIN
        </button>
        <button
          type="button"
          className="btn btn-danger"
          disabled={pending}
          onClick={() => confirm(`Delete "${share.title}"? The link stops working.`) && run(() => deleteShare(share.id))}
        >
          Delete
        </button>
      </div>
    </li>
  );
}
