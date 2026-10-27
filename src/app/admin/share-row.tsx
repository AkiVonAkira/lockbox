"use client";

import {
  CalendarPlus,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Layers,
  Link2,
  Lock,
  LockOpen,
  RotateCw,
  Send,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore, useTransition } from "react";

import { shareMessage } from "~/domain/share";

import { type Status } from "../_lib/status";
import { clearLockout, deleteShare, extendShare, rotatePin } from "./actions";

export type AdminShare = {
  id: string;
  title: string;
  pin: string;
  url: string;
  itemCount: number;
  views: number;
  status: Status;
  expired: boolean;
  /** Fewer than DEFAULT_TTL_DAYS left, so Extend moves the expiry. */
  extendable: boolean;
  lastViewed: string | null;
  createdAt: string;
  expiresAt: string;
  lockedUntil: string | null;
};

const MASK = "••••••••••••";
const STATUS_ICON = { ok: Clock, locked: Lock, expired: Clock } as const;

/** Exact dates use the browser's timezone, so they render only after hydration. */
const useMounted = () =>
  useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
const date = (iso: string) => new Date(iso).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
const dateTime = (iso: string) => new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

function IconButton({
  label,
  onClick,
  danger,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`ib ${danger ? "ib-danger" : ""}`}
      aria-label={label}
      data-tip={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function ShareRow({ share, notify }: { share: AdminShare; notify: (text: string, failed?: boolean) => void }) {
  const mounted = useMounted();
  const [shown, setShown] = useState(false);
  const [confirming, setConfirming] = useState<"delete" | "rotate" | null>(null);
  const [pending, start] = useTransition();
  const StatusIcon = STATUS_ICON[share.status.kind];

  const copy = (text: string, done: string) =>
    void navigator.clipboard.writeText(text).then(
      () => notify(done),
      () => notify("Copy failed", true),
    );
  // A failed action (a session that ran out, a share another tab deleted) says so and keeps the confirm open.
  const run = (action: () => Promise<void>, done: string) =>
    start(async () => {
      try {
        await action();
      } catch {
        notify("That did not work. Reload and try again.", true);
        return;
      }
      setConfirming(null);
      notify(done);
    });

  const statusTitle = !mounted
    ? undefined
    : share.status.kind === "locked" && share.lockedUntil
      ? `Five wrong PINs in a row. Unlocks ${dateTime(share.lockedUntil)}.`
      : `${share.expired ? "Expired" : "Expires"} ${date(share.expiresAt)}`;

  return (
    <li className={`glass flex flex-col gap-2.5 px-4 py-3.5 ${share.expired ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Link href={`/admin/view/${share.id}`} className="title-link text-[14.5px] font-semibold">
          {share.title}
        </Link>
        <span className={`pill pill-${share.status.kind}`} title={statusTitle}>
          <StatusIcon size={12} aria-hidden />
          {share.status.label}
        </span>
      </div>

      <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
        <span className="inline-flex items-center gap-1.5">
          <Layers size={13} aria-hidden />
          {share.itemCount} {share.itemCount === 1 ? "page" : "pages"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Eye size={13} aria-hidden />
          {share.views} {share.views === 1 ? "view" : "views"}
          {share.lastViewed && ` · last ${share.lastViewed}`}
        </span>
        {mounted && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarPlus size={13} aria-hidden />
            made {date(share.createdAt)}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inset min-w-0 flex-[1_1_320px]">
          <Link2 size={13} aria-hidden className="text-muted-foreground shrink-0" />
          <a href={share.url} target="_blank" rel="noreferrer" className="share-url min-w-0 flex-1 truncate">
            {share.url}
          </a>
          <IconButton label="Copy link" onClick={() => copy(share.url, "Link copied")}>
            <Copy size={15} aria-hidden />
          </IconButton>
          <a href={share.url} target="_blank" rel="noreferrer" className="ib" aria-label="Open public page" data-tip="Open public page">
            <ExternalLink size={15} aria-hidden />
          </a>
        </div>
        <div className="inset">
          <KeyRound size={13} aria-hidden className="text-muted-foreground shrink-0" />
          <code className="min-w-[13ch] font-mono text-[13px] tracking-[.12em]" aria-label="PIN">
            {shown ? share.pin : MASK}
          </code>
          <IconButton label={shown ? "Hide PIN" : "Show PIN"} onClick={() => setShown((s) => !s)}>
            {shown ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
          </IconButton>
          <IconButton label="Copy PIN" onClick={() => copy(share.pin, "PIN copied")}>
            <Copy size={15} aria-hidden />
          </IconButton>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-pri" onClick={() => copy(shareMessage(share.url, share.pin), "Link and PIN copied")}>
          <Send size={13} aria-hidden />
          Copy link + PIN
        </button>
        <Link href={`/admin/view/${share.id}`} className="btn">
          <Eye size={13} aria-hidden />
          Admin view
        </Link>
        <span className="flex-1" />
        {confirming ? (
          <span className="inline-flex flex-wrap items-center gap-2 text-[12px]">
            <span className="text-destructive">
              {confirming === "delete" ? "Delete? The link stops working." : "New PIN? The old one stops working."}
            </span>
            <button
              type="button"
              className="btn btn-confirm"
              disabled={pending}
              onClick={() =>
                confirming === "delete"
                  ? run(() => deleteShare(share.id), "Deleted")
                  : run(async () => {
                      await rotatePin(share.id);
                      setShown(true);
                    }, "New PIN set")
              }
            >
              {confirming === "delete" ? "Delete" : "New PIN"}
            </button>
            <button type="button" className="btn" disabled={pending} onClick={() => setConfirming(null)}>
              Cancel
            </button>
          </span>
        ) : (
          <span className="flex">
            {share.status.kind === "locked" && (
              <IconButton label="Unlock now" disabled={pending} onClick={() => run(() => clearLockout(share.id), "Unlocked")}>
                <LockOpen size={15} aria-hidden />
              </IconButton>
            )}
            <IconButton
              label={share.expired ? "Restore for 30 days" : share.extendable ? "Extend to 30 days" : "More than 30 days left"}
              disabled={pending || !share.extendable}
              onClick={() => run(() => extendShare(share.id), share.expired ? "Restored for 30 days" : "Extended to 30 days")}
            >
              <CalendarPlus size={15} aria-hidden />
            </IconButton>
            <IconButton label="New PIN" disabled={pending} onClick={() => setConfirming("rotate")}>
              <RotateCw size={15} aria-hidden />
            </IconButton>
            <IconButton label="Delete" danger disabled={pending} onClick={() => setConfirming("delete")}>
              <Trash2 size={15} aria-hidden />
            </IconButton>
          </span>
        )}
      </div>
    </li>
  );
}
