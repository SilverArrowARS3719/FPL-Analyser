import { averageFdr, getUpcomingFixtures } from "./fdr";
import { hasSeasonStarted } from "./gameweek";
import { POSITION, type Bootstrap, type Fixture, type Player } from "./types";

export const price = (p: Player) => p.now_cost / 10;
export const form = (p: Player) => Number.parseFloat(p.form) || 0;
export const xgi = (p: Player) => Number.parseFloat(p.expected_goal_involvements) || 0;
export const goalsPlusAssists = (p: Player) => p.goals_scored + p.assists;
export const pointsPerMillion = (p: Player) =>
  price(p) > 0 ? p.total_points / price(p) : 0;

/** Lower FDR is easier; convert to a "the higher the better" 1-5 component. */
function fixtureEaseComponent(fixtures: Fixture[], teamId: number, fromEvent: number, window: number) {
  const upcoming = getUpcomingFixtures(fixtures, teamId, fromEvent, window);
  const avg = averageFdr(upcoming);
  if (avg === null) return { component: 3, avgFdr: null, upcoming };
  return { component: 6 - avg, avgFdr: avg, upcoming };
}

export interface ScoredPlayer {
  player: Player;
  score: number;
  avgFdr: number | null;
  reasons: string[];
}

const WEIGHTS = { form: 2, xgi: 4, value: 1.5, fixture: 1.5 };

/** Heuristic "how good a buy is this right now" score — not a points predictor, a ranking aid. */
export function scoreForBuy(
  p: Player,
  fixtures: Fixture[],
  fromEvent: number,
  window = 5,
): ScoredPlayer {
  const { component, avgFdr } = fixtureEaseComponent(fixtures, p.team, fromEvent, window);
  const score =
    form(p) * WEIGHTS.form +
    xgi(p) * WEIGHTS.xgi +
    pointsPerMillion(p) * WEIGHTS.value +
    component * WEIGHTS.fixture;
  const reasons: string[] = [];
  if (form(p) >= 5) reasons.push("in strong recent form");
  if (xgi(p) >= 0.5) reasons.push("high underlying attacking threat (xGI)");
  if (avgFdr !== null && avgFdr <= 2.4) reasons.push("favourable upcoming fixtures");
  if (pointsPerMillion(p) >= 15) reasons.push("great value for money");
  return { player: p, score, avgFdr, reasons };
}

export interface BuyFilterOptions {
  position?: number;
  maxPrice?: number;
  excludeIds?: Set<number>;
}

export function rankBuyCandidates(
  players: Player[],
  fixtures: Fixture[],
  fromEvent: number,
  opts: BuyFilterOptions = {},
  limit = 20,
): ScoredPlayer[] {
  return players
    .filter((p) => p.status === "a") // exclude unavailable/injured/suspended
    .filter((p) => (opts.position ? p.element_type === opts.position : true))
    .filter((p) => (opts.maxPrice ? price(p) <= opts.maxPrice : true))
    .filter((p) => !opts.excludeIds?.has(p.id))
    .map((p) => scoreForBuy(p, fixtures, fromEvent))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export interface DropFlag extends ScoredPlayer {
  flagged: boolean;
}

/** Flags current-squad players worth considering dropping, with plain-language reasons. */
export function rankDropCandidates(
  squad: Player[],
  fixtures: Fixture[],
  fromEvent: number,
  bootstrap: Bootstrap,
): DropFlag[] {
  const seasonStarted = hasSeasonStarted(bootstrap);
  return squad
    .map((p) => {
      const scored = scoreForBuy(p, fixtures, fromEvent, 3);
      const reasons: string[] = [];
      if (p.chance_of_playing_next_round !== null && p.chance_of_playing_next_round < 75) {
        reasons.push(
          `${p.chance_of_playing_next_round}% chance of playing next round`,
        );
      }
      if (p.news) reasons.push(p.news);
      if (seasonStarted && form(p) < 2) reasons.push("poor recent form");
      if (scored.avgFdr !== null && scored.avgFdr >= 3.8) {
        reasons.push("tough run of upcoming fixtures");
      }
      return { ...scored, reasons, flagged: reasons.length > 0 };
    })
    .sort((a, b) => a.score - b.score);
}

export interface BestXIResult {
  startingIds: number[];
  benchIds: number[];
}

/** Greedy formation-respecting XI picker: min 3 DEF / 2 MID / 1 FWD, then best-remaining fills 4 more slots. */
export function pickBestXI(
  squad: Player[],
  fixtures: Fixture[],
  fromEvent: number,
): BestXIResult {
  const scored = new Map<number, number>();
  for (const p of squad) {
    scored.set(p.id, scoreForBuy(p, fixtures, fromEvent, 4).score);
  }
  const byScoreDesc = (a: Player, b: Player) =>
    (scored.get(b.id) ?? 0) - (scored.get(a.id) ?? 0);

  const gks = squad.filter((p) => p.element_type === POSITION.GKP).sort(byScoreDesc);
  const defs = squad.filter((p) => p.element_type === POSITION.DEF).sort(byScoreDesc);
  const mids = squad.filter((p) => p.element_type === POSITION.MID).sort(byScoreDesc);
  const fwds = squad.filter((p) => p.element_type === POSITION.FWD).sort(byScoreDesc);

  const starters: Player[] = [];
  if (gks[0]) starters.push(gks[0]);
  starters.push(...defs.slice(0, 3));
  starters.push(...mids.slice(0, 2));
  starters.push(...fwds.slice(0, 1));

  const startedIds = new Set(starters.map((p) => p.id));
  const remainingCounts = { DEF: 3, MID: 2, FWD: 1 };
  const pool = [...defs.slice(3), ...mids.slice(2), ...fwds.slice(1)].sort(byScoreDesc);

  const outfieldStarters = starters.length - (gks[0] ? 1 : 0);
  let slotsLeft = 10 - outfieldStarters; // outfield slots left to fill (10 outfield total)
  for (const p of pool) {
    if (slotsLeft <= 0) break;
    if (p.element_type === POSITION.DEF && remainingCounts.DEF >= 5) continue;
    if (p.element_type === POSITION.MID && remainingCounts.MID >= 5) continue;
    if (p.element_type === POSITION.FWD && remainingCounts.FWD >= 3) continue;
    starters.push(p);
    startedIds.add(p.id);
    if (p.element_type === POSITION.DEF) remainingCounts.DEF++;
    if (p.element_type === POSITION.MID) remainingCounts.MID++;
    if (p.element_type === POSITION.FWD) remainingCounts.FWD++;
    slotsLeft--;
  }

  const bench = squad
    .filter((p) => !startedIds.has(p.id))
    .sort(byScoreDesc);

  return {
    startingIds: starters.map((p) => p.id),
    benchIds: bench.map((p) => p.id),
  };
}

export interface CaptainSuggestion {
  captainId: number | null;
  viceCaptainId: number | null;
  breakdown: { player: Player; score: number; nextFixture: string }[];
}

export function suggestCaptain(
  startingXI: Player[],
  fixtures: Fixture[],
  fromEvent: number,
  teamsById: Map<number, { short_name: string }>,
): CaptainSuggestion {
  const breakdown = startingXI.map((p) => {
    const upcoming = getUpcomingFixtures(fixtures, p.team, fromEvent, 1);
    const next = upcoming[0];
    const fdrComponent = next ? 6 - next.difficulty : 3;
    const homeBonus = next?.isHome ? 1 : 0;
    const score = form(p) * 3 + xgi(p) * 5 + fdrComponent * 3 + homeBonus;
    const oppName = next ? teamsById.get(next.opponent)?.short_name ?? "?" : "no fixture";
    const nextFixture = next ? `${oppName} (${next.isHome ? "H" : "A"})` : "no fixture";
    return { player: p, score, nextFixture };
  });
  breakdown.sort((a, b) => b.score - a.score);
  return {
    captainId: breakdown[0]?.player.id ?? null,
    viceCaptainId: breakdown[1]?.player.id ?? null,
    breakdown,
  };
}
