import type { Fixture } from "./types";

export interface UpcomingFixture {
  event: number;
  opponent: number;
  isHome: boolean;
  difficulty: number;
}

/** Next `count` fixtures for a team from `fromEvent` onward, in gameweek order. */
export function getUpcomingFixtures(
  fixtures: Fixture[],
  teamId: number,
  fromEvent: number,
  count: number,
): UpcomingFixture[] {
  return fixtures
    .filter(
      (f) =>
        f.event !== null &&
        f.event >= fromEvent &&
        (f.team_h === teamId || f.team_a === teamId),
    )
    .sort((a, b) => (a.event as number) - (b.event as number))
    .slice(0, count)
    .map((f) => {
      const isHome = f.team_h === teamId;
      return {
        event: f.event as number,
        opponent: isHome ? f.team_a : f.team_h,
        isHome,
        difficulty: isHome ? f.team_h_difficulty : f.team_a_difficulty,
      };
    });
}

export function averageFdr(fixtures: { difficulty: number }[]): number | null {
  if (!fixtures.length) return null;
  return fixtures.reduce((sum, f) => sum + f.difficulty, 0) / fixtures.length;
}

/** How many fixtures each team has in each gameweek — reveals blank (0) and double (2+) gameweeks. */
export function getFixtureCountsByEvent(
  fixtures: Fixture[],
  teamId: number,
  fromEvent: number,
  toEvent: number,
): Map<number, number> {
  const counts = new Map<number, number>();
  for (let ev = fromEvent; ev <= toEvent; ev++) counts.set(ev, 0);
  for (const f of fixtures) {
    if (f.event === null || f.event < fromEvent || f.event > toEvent) continue;
    if (f.team_h === teamId || f.team_a === teamId) {
      counts.set(f.event, (counts.get(f.event) ?? 0) + 1);
    }
  }
  return counts;
}

export function findBlankEvents(counts: Map<number, number>): number[] {
  return [...counts.entries()].filter(([, n]) => n === 0).map(([ev]) => ev);
}

export function findDoubleEvents(counts: Map<number, number>): number[] {
  return [...counts.entries()].filter(([, n]) => n >= 2).map(([ev]) => ev);
}
