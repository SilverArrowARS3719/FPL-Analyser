import { getUpcomingFixtures } from "./fdr";
import type { Fixture, Team } from "./types";

export function opponentLabelFor(
  teamId: number,
  fixtures: Fixture[],
  fromEvent: number,
  teamsById: Map<number, Team>,
): string {
  const next = getUpcomingFixtures(fixtures, teamId, fromEvent, 1)[0];
  if (!next) return "No fixture";
  const opp = teamsById.get(next.opponent)?.short_name ?? "?";
  return `${opp} (${next.isHome ? "H" : "A"})`;
}
