const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** A rough, timezone-free length of time, so the server and the browser render the same text. */
export function span(ms: number) {
  const abs = Math.abs(ms);
  if (abs < MIN) return "under a minute";
  if (abs < HOUR) return `${Math.floor(abs / MIN)} min`;
  if (abs < DAY) return `${Math.floor(abs / HOUR)} h`;
  const days = Math.floor(abs / DAY);
  return `${days} ${days === 1 ? "day" : "days"}`;
}

export type Status = { kind: "ok" | "locked" | "expired"; label: string };

/** The one-line state a share's pill shows. A lockout wins over the days left; expiry wins over both. */
export function shareStatus(share: { expiresAt: Date; lockedUntil: Date | null }, now: number): Status {
  const left = share.expiresAt.getTime() - now;
  if (left <= 0) return { kind: "expired", label: `Expired ${span(left)} ago` };
  const locked = share.lockedUntil ? share.lockedUntil.getTime() - now : 0;
  if (locked > 0) return { kind: "locked", label: `Locked for ${span(locked)}` };
  return { kind: "ok", label: `${span(left)} left` };
}

export const FILTERS = ["active", "expired", "all"] as const;
export type Filter = (typeof FILTERS)[number];

export function readFilter(value: unknown): Filter {
  return FILTERS.includes(value as Filter) ? (value as Filter) : "active";
}
