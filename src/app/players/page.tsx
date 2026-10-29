import Link from "next/link";
import { Suspense } from "react";
import { Loading, NoData, PositionBadge, StatusDot } from "@/components/ui";
import { POSITIONS, type Position } from "@/lib/game/types";
import { allClubs, playerTable, type PlayerRow } from "@/lib/queries";

const SORTS = {
  points: "Points",
  goals: "Goals",
  assists: "Assists",
  minutes: "Minutes",
} as const satisfies Partial<Record<keyof PlayerRow, string>>;
type Sort = keyof typeof SORTS;

const PAGE_SIZE = 50;

export default function PlayersPage({ searchParams }: PageProps<"/players">) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Players</h1>
      <Suspense fallback={<Loading />}>
        <PlayerList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

async function PlayerList({ searchParams }: { searchParams: PageProps<"/players">["searchParams"] }) {
  const params = await searchParams;
  const q = one(params.q)?.trim().toLowerCase() ?? "";
  const pos = POSITIONS.includes(one(params.pos) as Position) ? (one(params.pos) as Position) : null;
  const club = Number(one(params.club)) || null;
  const sortParam = one(params.sort) ?? "";
  const sort: Sort = sortParam in SORTS ? (sortParam as Sort) : "points";
  const page = Math.max(1, Number(one(params.page)) || 1);

  const [rows, clubs] = await Promise.all([playerTable(), allClubs()]);
  if (rows.length === 0) return <NoData />;

  const filtered = rows
    .filter((r) => !pos || r.position === pos)
    .filter((r) => !club || r.clubId === club)
    .filter((r) => !q || r.name.toLowerCase().includes(q) || r.fullName.toLowerCase().includes(q))
    .sort((a, b) => b[sort] - a[sort] || a.name.localeCompare(b.name));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pageHref = (p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (pos) sp.set("pos", pos);
    if (club) sp.set("club", String(club));
    if (sort !== "points") sp.set("sort", sort);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return s ? `/players?${s}` : "/players";
  };

  const field = "rounded-md border border-line bg-surface px-3 py-2 text-sm";
  return (
    <div className="space-y-4">
      <form className="flex flex-wrap gap-2" action="/players">
        <input name="q" defaultValue={q} placeholder="Search name" className={`${field} w-full sm:w-auto sm:flex-1`} />
        <select name="pos" defaultValue={pos ?? ""} className={field} aria-label="Position">
          <option value="">All positions</option>
          {POSITIONS.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select name="club" defaultValue={club ?? ""} className={field} aria-label="Club">
          <option value="">All clubs</option>
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={sort} className={field} aria-label="Sort by">
          {Object.entries(SORTS).map(([k, v]) => (
            <option key={k} value={k}>
              Sort: {v}
            </option>
          ))}
        </select>
        <button className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background">Filter</button>
      </form>

      <p className="text-sm text-muted">{filtered.length} players</p>

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-2">Player</th>
              <th className="px-3 py-2">Club</th>
              <th className="px-3 py-2 text-right">Apps</th>
              <th className="px-3 py-2 text-right">Mins</th>
              <th className="px-3 py-2 text-right">G</th>
              <th className="px-3 py-2 text-right">A</th>
              <th className="px-3 py-2 text-right">CS</th>
              <th className="px-3 py-2 text-right">Pts</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="whitespace-nowrap px-3 py-2">
                  <PositionBadge position={r.position} />{" "}
                  <Link href={`/players/${r.id}`} className="font-medium hover:underline">
                    {r.name}
                  </Link>
                  <StatusDot status={r.status} news={r.news} />
                </td>
                <td className="px-3 py-2 text-muted">{r.club}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.apps}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.minutes}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.goals}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.assists}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.cleanSheets}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          {page > 1 ? <Link href={pageHref(page - 1)} className="text-accent hover:underline">← Previous</Link> : <span />}
          <span className="text-muted">
            Page {page} of {pages}
          </span>
          {page < pages ? <Link href={pageHref(page + 1)} className="text-accent hover:underline">Next →</Link> : <span />}
        </div>
      )}
    </div>
  );
}
