import type { Position } from "@/lib/game/types";

const POSITION_STYLE: Record<Position, string> = {
  GK: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  DEF: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200",
  MID: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  FWD: "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200",
};

export function PositionBadge({ position }: { position: Position }) {
  return (
    <span className={`inline-block w-10 rounded px-1.5 py-0.5 text-center text-xs font-semibold ${POSITION_STYLE[position]}`}>
      {position}
    </span>
  );
}

const STATUS_LABEL: Record<string, string> = {
  d: "Doubtful",
  i: "Injured",
  s: "Suspended",
  u: "Unavailable",
  n: "Not in squad",
};

export function StatusDot({ status, news }: { status: string; news: string }) {
  if (status === "a") return null;
  const label = STATUS_LABEL[status] ?? status;
  return (
    <span title={news || label} className={`ml-1.5 text-xs ${status === "d" ? "text-amber-600" : "text-bad"}`}>
      ● <span className="sr-only">{label}</span>
    </span>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-line bg-surface p-4 ${className}`}>{children}</div>;
}

export function NoData() {
  return (
    <Card>
      <p className="font-medium">No Premier League data yet.</p>
      <p className="mt-1 text-sm text-muted">
        Run <code className="rounded bg-accent-soft px-1">npm run sync</code> to pull players, fixtures and stats from
        the Fantasy Premier League API.
      </p>
    </Card>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return <p className="animate-pulse text-sm text-muted">{label}</p>;
}
