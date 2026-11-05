import { notFound } from "next/navigation";
import { COMPETITIONS, getCompetition, type Competition } from "@/lib/competitions";

export function competitionParams() {
  return COMPETITIONS.map((c) => ({ competition: c.id }));
}

/** The competition named in the URL, or a 404. */
export async function competitionFrom(params: Promise<{ competition: string }>): Promise<Competition> {
  const c = getCompetition((await params).competition);
  if (!c) notFound();
  return c;
}

/** Like competitionFrom, but 404s for competitions that aren't playable yet. */
export async function liveCompetitionFrom(params: Promise<{ competition: string }>): Promise<Competition> {
  const c = await competitionFrom(params);
  if (c.status !== "live") notFound();
  return c;
}
