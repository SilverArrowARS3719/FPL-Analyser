import {
  form,
  pointsPerMillion,
  pickBestXI,
  price,
  rankBuyCandidates,
  rankDropCandidates,
  scoreForBuy,
  suggestCaptain,
  type BestXIResult,
  type CaptainSuggestion,
  type DropFlag,
  type ScoredPlayer,
} from "./analysis";
import type { ChipSuggestion } from "./chips";
import { hasSeasonStarted } from "./gameweek";
import type {
  Bootstrap,
  ElementSummaryHistoryEntry,
  ElementSummaryHistoryPast,
  ElementSummaryResponse,
  Fixture,
  Player,
} from "./types";
import type { ResolvedSquad } from "./useMySquad";

/** The chip the user has marked as "using" this gameweek via the My Team tracker, if any. */
export type ActiveChip = ChipSuggestion["chip"] | null;

export const REPLACEMENT_POOL_PER_POSITION = 6;
export const MAX_DEPTH_TEAMMATES_PER_GROUP = 6;
export const MAX_ELEMENT_SUMMARY_CALLS = 80;
export const MAX_SWAP_RESULTS = 15;
export const INITIAL_VISIBLE_SWAPS = 5;
export const SWAP_BACKUP_COUNT = 2;
export const CAPTAIN_PICKS_SHOWN = 5;
const MEANINGFUL_MINUTES = 900;
const MIN_SCORE_MARGIN = 2;
const OPTIONAL_MIN_MARGIN = 0.5;
const WEIGHTS_V2 = { nailedOn: 6, trend: 3, depth: 4 };

function getTeammates(bootstrap: Bootstrap, player: Player): Player[] {
  return bootstrap.elements.filter(
    (e) => e.team === player.team && e.element_type === player.element_type,
  );
}

// ---------------------------------------------------------------------------
// Rotation / probable-playtime risk
// ---------------------------------------------------------------------------

export interface NailedOnResult {
  score: number; // 0..1
  label: "Nailed-on" | "Rotation risk" | "Fringe";
  detail: string;
}

function startsRatioFromRecent(history: ElementSummaryHistoryEntry[], window: number): number | null {
  if (history.length === 0) return null;
  const recent = history.slice(-window);
  const starts = recent.reduce((sum, h) => sum + h.starts, 0);
  return starts / recent.length;
}

export function nailedOnScore(
  player: Player,
  summary: ElementSummaryResponse | undefined,
  seasonStarted: boolean,
): NailedOnResult {
  let ratio: number | null = null;
  let basis = "";

  if (seasonStarted && summary) {
    ratio = startsRatioFromRecent(summary.history, 5);
    basis = "recent gameweeks";
  }
  if (ratio === null && summary?.history_past.length) {
    const last = summary.history_past[summary.history_past.length - 1];
    if (last.minutes > 0) {
      ratio = Math.min(1, last.starts / 38);
      basis = `${last.season_name} season`;
    }
  }
  if (ratio === null) {
    ratio = 0.5;
    basis = "no prior data";
  }

  const availability = (player.chance_of_playing_next_round ?? 100) / 100;
  const score = ratio * availability;
  const label: NailedOnResult["label"] =
    score >= 0.7 ? "Nailed-on" : score >= 0.4 ? "Rotation risk" : "Fringe";
  const detail =
    basis === "no prior data"
      ? "No prior playing-time data available"
      : `${Math.round(ratio * 100)}% starts rate (${basis})${
          availability < 1 ? `, ${Math.round(availability * 100)}% fit` : ""
        }`;

  return { score, label, detail };
}

// ---------------------------------------------------------------------------
// Multi-season career trend (real history_past data only)
// ---------------------------------------------------------------------------

export interface CareerTrendResult {
  score: number; // -1..1
  label: "Rising" | "Declining" | "Stable" | "Insufficient history";
  detail: string;
}

function pointsPer90(entry: ElementSummaryHistoryPast): number | null {
  if (entry.minutes < 450) return null;
  return (entry.total_points / entry.minutes) * 90;
}

export function careerTrendScore(summary: ElementSummaryResponse | undefined): CareerTrendResult {
  const seasons = summary?.history_past ?? [];
  const recentSeasons = seasons.slice(-3).filter((s) => pointsPer90(s) !== null);

  if (recentSeasons.length < 2) {
    return {
      score: 0,
      label: "Insufficient history",
      detail: "Fewer than two full prior seasons on record",
    };
  }

  const firstP90 = pointsPer90(recentSeasons[0])!;
  const lastP90 = pointsPer90(recentSeasons[recentSeasons.length - 1])!;
  const change = firstP90 > 0 ? (lastP90 - firstP90) / firstP90 : 0;
  const label: CareerTrendResult["label"] =
    change >= 0.15 ? "Rising" : change <= -0.15 ? "Declining" : "Stable";
  const score = Math.max(-1, Math.min(1, change));
  const detail = `${recentSeasons.map((s) => s.total_points).join(" → ")} pts across the last ${recentSeasons.length} seasons`;

  return { score, label, detail };
}

// ---------------------------------------------------------------------------
// Competition for a starting shirt (real minutes-based proxy)
// ---------------------------------------------------------------------------

export interface DepthResult {
  score: number; // 0 (crowded) .. 1 (clear)
  label: "Clear starting spot" | "Some competition" | "Crowded position";
  detail: string;
}

export function positionDepthScore(
  player: Player,
  teammates: Player[],
  summaries: Map<number, ElementSummaryResponse>,
  seasonStarted: boolean,
): DepthResult {
  const rivals = teammates.filter((t) => t.id !== player.id);
  let contenders = 0;
  let estimated = 0;

  for (const t of rivals) {
    if (seasonStarted) {
      if (t.minutes >= MEANINGFUL_MINUTES) contenders++;
      continue;
    }
    const summary = summaries.get(t.id);
    if (summary) {
      const last = summary.history_past[summary.history_past.length - 1];
      if (last && last.minutes >= MEANINGFUL_MINUTES) contenders++;
    } else if (price(t) >= price(player) * 0.6) {
      contenders++;
      estimated++;
    }
  }

  const label: DepthResult["label"] =
    contenders === 0 ? "Clear starting spot" : contenders <= 2 ? "Some competition" : "Crowded position";
  const score = contenders === 0 ? 1 : contenders <= 2 ? 0.5 : 0;
  const estimatedNote = estimated > 0 ? " (some estimated)" : "";
  const detail =
    contenders === 0
      ? "No other recognized options in this position at this club"
      : `${contenders} other recognized option${contenders === 1 ? "" : "s"} in this position${estimatedNote}`;

  return { score, label, detail };
}

// ---------------------------------------------------------------------------
// Combined score
// ---------------------------------------------------------------------------

export interface TransformationScore extends ScoredPlayer {
  nailedOn: NailedOnResult;
  careerTrend: CareerTrendResult;
  depth: DepthResult;
  finalScore: number;
  headlineReasons: string[];
}

export function scoreForTransformation(
  p: Player,
  fixtures: Fixture[],
  fromEvent: number,
  teammates: Player[],
  summaries: Map<number, ElementSummaryResponse>,
  seasonStarted: boolean,
  window = 5,
): TransformationScore {
  const base = scoreForBuy(p, fixtures, fromEvent, window);
  const summary = summaries.get(p.id);
  const nailedOn = nailedOnScore(p, summary, seasonStarted);
  const careerTrend = careerTrendScore(summary);
  const depth = positionDepthScore(p, teammates, summaries, seasonStarted);

  const finalScore =
    base.score +
    nailedOn.score * WEIGHTS_V2.nailedOn +
    careerTrend.score * WEIGHTS_V2.trend +
    depth.score * WEIGHTS_V2.depth;

  const headlineReasons = [...base.reasons];
  if (nailedOn.label === "Nailed-on") headlineReasons.push("nailed-on starter");
  if (careerTrend.label === "Rising") headlineReasons.push("career trending up");
  if (depth.label === "Clear starting spot") headlineReasons.push("no competition for his spot");

  return { ...base, nailedOn, careerTrend, depth, finalScore, headlineReasons };
}

// ---------------------------------------------------------------------------
// Team Rating — percentile squad quality vs league-wide position peers
// ---------------------------------------------------------------------------

export interface TeamRating {
  rating: number; // 0..100
  label: string;
  weakestLink: Player | null;
}

const RATING_LABELS: [number, string][] = [
  [80, "Excellent squad"],
  [60, "Good squad"],
  [40, "Average squad"],
  [20, "Needs work"],
  [0, "Rebuild"],
];

export function computeTeamRating(
  squad: Player[],
  bootstrap: Bootstrap,
  fixtures: Fixture[],
  fromEvent: number,
): TeamRating {
  const peersByPosition = new Map<number, number[]>();
  function peerScores(position: number): number[] {
    const cached = peersByPosition.get(position);
    if (cached) return cached;
    const scores = bootstrap.elements
      .filter((p) => p.element_type === position && p.minutes > 0)
      .map((p) => scoreForBuy(p, fixtures, fromEvent, 5).score);
    peersByPosition.set(position, scores);
    return scores;
  }

  let totalPercentile = 0;
  let weakestLink: Player | null = null;
  let weakestPercentile = 101;

  for (const player of squad) {
    const peers = peerScores(player.element_type);
    const myScore = scoreForBuy(player, fixtures, fromEvent, 5).score;
    const below = peers.filter((s) => s < myScore).length;
    const percentile = peers.length > 1 ? (below / (peers.length - 1)) * 100 : 50;
    totalPercentile += percentile;
    if (percentile < weakestPercentile) {
      weakestPercentile = percentile;
      weakestLink = player;
    }
  }

  const rating = squad.length > 0 ? Math.round(totalPercentile / squad.length) : 50;
  const label = RATING_LABELS.find(([threshold]) => rating >= threshold)?.[1] ?? "Rebuild";

  return { rating, label, weakestLink };
}

// ---------------------------------------------------------------------------
// Shortlist funnel — narrows ~577 players down to a bounded enrichment set
// ---------------------------------------------------------------------------

export interface ShortlistResult {
  fetchIds: number[];
  dropCandidates: DropFlag[];
  replacementPoolByPosition: Map<number, ScoredPlayer[]>;
}

export function buildShortlist(
  squad: Player[],
  bootstrap: Bootstrap,
  fixtures: Fixture[],
  fromEvent: number,
): ShortlistResult {
  const dropCandidates = rankDropCandidates(squad, fixtures, fromEvent, bootstrap).filter(
    (d) => d.flagged,
  );
  const squadIds = new Set(squad.map((p) => p.id));
  // Every position in the squad gets a replacement pool, not just flagged ones —
  // "more suggestions" and Team Rating both need a full picture, not just problems.
  const allPositions = new Set(squad.map((p) => p.element_type));

  const replacementPoolByPosition = new Map<number, ScoredPlayer[]>();
  for (const pos of allPositions) {
    replacementPoolByPosition.set(
      pos,
      rankBuyCandidates(
        bootstrap.elements,
        fixtures,
        fromEvent,
        { position: pos, excludeIds: squadIds },
        REPLACEMENT_POOL_PER_POSITION,
      ),
    );
  }

  const corePlayers = [
    ...squad,
    ...[...replacementPoolByPosition.values()].flat().map((sp) => sp.player),
  ];
  const coreIds = new Set(corePlayers.map((p) => p.id));

  const teammateIds = new Set<number>();
  const seenGroups = new Set<string>();
  for (const p of corePlayers) {
    const groupKey = `${p.team}-${p.element_type}`;
    if (seenGroups.has(groupKey)) continue;
    seenGroups.add(groupKey);
    getTeammates(bootstrap, p)
      .sort((a, b) => price(b) - price(a))
      .slice(0, MAX_DEPTH_TEAMMATES_PER_GROUP)
      .forEach((t) => teammateIds.add(t.id));
  }

  let fetchIds = [...new Set([...coreIds, ...teammateIds])];
  if (fetchIds.length > MAX_ELEMENT_SUMMARY_CALLS) {
    const prioritized = fetchIds.filter((id) => coreIds.has(id));
    const rest = fetchIds.filter((id) => !coreIds.has(id));
    fetchIds = [...prioritized, ...rest].slice(0, MAX_ELEMENT_SUMMARY_CALLS);
  }

  return { fetchIds, dropCandidates, replacementPoolByPosition };
}

// ---------------------------------------------------------------------------
// Swap pairing — OUT/IN + backups, budget-aware, capped, persuasive
// ---------------------------------------------------------------------------

export interface SwapSuggestion {
  out: Player;
  in: Player;
  backups: Player[];
  outScore: TransformationScore;
  inScore: TransformationScore;
  costDelta: number;
  rationale: string;
  priority: "recommended" | "optional";
}

function buildSwapRationale(
  outPlayer: Player,
  inPlayer: Player,
  outScore: TransformationScore,
  inScore: TransformationScore,
): string {
  const bits: string[] = [];
  if (form(inPlayer) > form(outPlayer)) {
    bits.push(`stronger form (${form(inPlayer).toFixed(1)} vs ${form(outPlayer).toFixed(1)})`);
  }
  if (
    inScore.avgFdr !== null &&
    outScore.avgFdr !== null &&
    inScore.avgFdr < outScore.avgFdr - 0.3
  ) {
    bits.push("a kinder run of fixtures");
  }
  if (inScore.nailedOn.label === "Nailed-on" && outScore.nailedOn.label !== "Nailed-on") {
    bits.push("more nailed-on for minutes");
  }
  if (inScore.depth.label === "Clear starting spot" && outScore.depth.label !== "Clear starting spot") {
    bits.push("no real competition for his shirt");
  }
  if (inScore.careerTrend.label === "Rising") {
    bits.push("a career trending up");
  }
  if (pointsPerMillion(inPlayer) > pointsPerMillion(outPlayer)) {
    bits.push("better value for money");
  }

  if (bits.length === 0) {
    return `${inPlayer.web_name} rates higher than ${outPlayer.web_name} right now on the underlying numbers.`;
  }
  const joined =
    bits.length === 1 ? bits[0] : `${bits.slice(0, -1).join(", ")} and ${bits[bits.length - 1]}`;
  return `${inPlayer.web_name} over ${outPlayer.web_name} — ${joined}.`;
}

export function suggestSwaps(
  squad: Player[],
  shortlist: ShortlistResult,
  bootstrap: Bootstrap,
  fixtures: Fixture[],
  fromEvent: number,
  bank: number,
  summaries: Map<number, ElementSummaryResponse>,
  activeChip: ActiveChip = null,
): SwapSuggestion[] {
  const seasonStarted = hasSeasonStarted(bootstrap);
  const flaggedIds = new Set(shortlist.dropCandidates.map((d) => d.player.id));
  // Wildcard/Free Hit make every transfer free this week — worth surfacing a
  // fuller picture of upgrades, not just the urgent ones.
  const freeTransferWeek = activeChip === "Wildcard" || activeChip === "Free Hit";
  const resultCap = freeTransferWeek ? MAX_SWAP_RESULTS * 2 : MAX_SWAP_RESULTS;
  const marginScale = freeTransferWeek ? 0.5 : 1;

  const scoreCache = new Map<number, TransformationScore>();
  function scoreOf(p: Player): TransformationScore {
    const cached = scoreCache.get(p.id);
    if (cached) return cached;
    const teammates = getTeammates(bootstrap, p);
    const scored = scoreForTransformation(p, fixtures, fromEvent, teammates, summaries, seasonStarted);
    scoreCache.set(p.id, scored);
    return scored;
  }

  // Worst-first so genuinely weak picks get first claim on the best replacements.
  const rankedSquad = [...squad].sort((a, b) => scoreOf(a).finalScore - scoreOf(b).finalScore);

  const candidates: {
    out: Player;
    outScore: TransformationScore;
    options: { candidate: Player; inScore: TransformationScore }[];
  }[] = [];

  for (const outPlayer of rankedSquad) {
    const pool = shortlist.replacementPoolByPosition.get(outPlayer.element_type) ?? [];
    const outScore = scoreOf(outPlayer);
    const minMargin =
      (flaggedIds.has(outPlayer.id) ? MIN_SCORE_MARGIN : OPTIONAL_MIN_MARGIN) * marginScale;

    const options = pool
      .map((sp) => ({ candidate: sp.player, inScore: scoreOf(sp.player) }))
      .filter((o) => o.inScore.finalScore - outScore.finalScore >= minMargin)
      .sort((a, b) => b.inScore.finalScore - a.inScore.finalScore);

    if (options.length > 0) {
      candidates.push({ out: outPlayer, outScore, options });
    }
  }

  const suggestions: SwapSuggestion[] = [];
  let workingBank = bank;
  const usedInIds = new Set<number>();

  for (const c of candidates) {
    if (suggestions.length >= resultCap) break;
    const outPrice = price(c.out);
    const affordable = c.options.filter(
      (o) => !usedInIds.has(o.candidate.id) && price(o.candidate) - outPrice <= workingBank,
    );
    if (affordable.length === 0) continue;

    const [primary, ...rest] = affordable;
    const backups = rest.slice(0, SWAP_BACKUP_COUNT).map((o) => o.candidate);

    workingBank -= price(primary.candidate) - outPrice;
    usedInIds.add(primary.candidate.id);
    backups.forEach((b) => usedInIds.add(b.id));

    suggestions.push({
      out: c.out,
      in: primary.candidate,
      backups,
      outScore: c.outScore,
      inScore: primary.inScore,
      costDelta: price(primary.candidate) - outPrice,
      rationale: buildSwapRationale(c.out, primary.candidate, c.outScore, primary.inScore),
      priority: flaggedIds.has(c.out.id) ? "recommended" : "optional",
    });
  }

  return suggestions;
}

// ---------------------------------------------------------------------------
// Captain / vice-captain diff
// ---------------------------------------------------------------------------

export interface CaptainDiff {
  currentCaptain: Player | null;
  currentVice: Player | null;
  suggestedCaptain: Player | null;
  suggestedVice: Player | null;
  captainMatches: boolean;
  viceMatches: boolean;
  message: string;
}

export function buildCaptainDiff(
  resolved: ResolvedSquad,
  suggestion: CaptainSuggestion,
): CaptainDiff {
  const currentCaptain = resolved.players.find((p) => p.isCaptain)?.player ?? null;
  const currentVice = resolved.players.find((p) => p.isViceCaptain)?.player ?? null;
  const suggestedCaptain =
    suggestion.breakdown.find((b) => b.player.id === suggestion.captainId)?.player ?? null;
  const suggestedVice =
    suggestion.breakdown.find((b) => b.player.id === suggestion.viceCaptainId)?.player ?? null;

  const captainMatches = !!currentCaptain && currentCaptain.id === suggestedCaptain?.id;
  const viceMatches = !!currentVice && currentVice.id === suggestedVice?.id;

  let message: string;
  if (captainMatches) {
    const top = suggestion.breakdown[0];
    message = top
      ? `${currentCaptain!.web_name} is the right captain call — best fixture/form combination in your XI (${top.nextFixture}).`
      : "Your captain choice looks fine.";
  } else if (suggestedCaptain) {
    message = `Captain ${suggestedCaptain.web_name} instead of ${currentCaptain?.web_name ?? "your current pick"} — stronger form and fixture profile this week.`;
  } else {
    message = "Not enough data yet to suggest a captain change.";
  }

  return {
    currentCaptain,
    currentVice,
    suggestedCaptain,
    suggestedVice,
    captainMatches,
    viceMatches,
    message,
  };
}

// ---------------------------------------------------------------------------
// Lineup (start/bench) diff — position-paired
// ---------------------------------------------------------------------------

export interface LineupPair {
  start: Player;
  bench: Player | null;
}

export interface LineupDiff {
  pairs: LineupPair[];
}

export function buildLineupDiff(
  squad: Player[],
  resolved: ResolvedSquad,
  bestXI: BestXIResult,
): LineupDiff {
  const actualStartingIds = new Set(
    resolved.players.filter((p) => p.isStarting).map((p) => p.player.id),
  );
  const suggestedStartingIds = new Set(bestXI.startingIds);

  const startInstead = squad.filter(
    (p) => suggestedStartingIds.has(p.id) && !actualStartingIds.has(p.id),
  );
  const benchInsteadPool = squad.filter(
    (p) => !suggestedStartingIds.has(p.id) && actualStartingIds.has(p.id),
  );

  const usedBenchIds = new Set<number>();
  const pairs: LineupPair[] = startInstead.map((startPlayer) => {
    const match = benchInsteadPool.find(
      (b) => b.element_type === startPlayer.element_type && !usedBenchIds.has(b.id),
    );
    if (match) usedBenchIds.add(match.id);
    return { start: startPlayer, bench: match ?? null };
  });

  return { pairs };
}

// ---------------------------------------------------------------------------
// Chip context — how the active chip (if any) reshapes the plan above
// ---------------------------------------------------------------------------

export interface ChipContext {
  active: ActiveChip;
  note: string | null;
  /** When true, the UI should surface bench/lineup items ahead of transfer swaps. */
  prioritizeBench: boolean;
}

function buildChipContext(activeChip: ActiveChip): ChipContext {
  switch (activeChip) {
    case "Wildcard":
      return {
        active: activeChip,
        note: "Wildcard is active — every transfer is free this week, so the thresholds below are relaxed to show a fuller set of upgrades, not just urgent ones.",
        prioritizeBench: false,
      };
    case "Free Hit":
      return {
        active: activeChip,
        note: "Free Hit is active — this is a one-week-only reset, so suggestions below are looser too. Your squad reverts next gameweek, so treat these as picks for this week only.",
        prioritizeBench: false,
      };
    case "Bench Boost":
      return {
        active: activeChip,
        note: "Bench Boost is active — all 15 players score this week, so lineup and bench-strength suggestions are prioritized below.",
        prioritizeBench: true,
      };
    case "Triple Captain":
      return {
        active: activeChip,
        note: "Triple Captain is active — make sure the captain pick below has the kindest possible fixture before you lock it in.",
        prioritizeBench: false,
      };
    default:
      return { active: null, note: null, prioritizeBench: false };
  }
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export interface TransformationPlan {
  swaps: SwapSuggestion[];
  captainDiff: CaptainDiff;
  captainBreakdown: CaptainSuggestion["breakdown"];
  lineupDiff: LineupDiff;
  teamRating: TeamRating;
  chipContext: ChipContext;
}

export function buildTransformationPlan(
  shortlist: ShortlistResult,
  squad: Player[],
  resolved: ResolvedSquad,
  bootstrap: Bootstrap,
  fixtures: Fixture[],
  fromEvent: number,
  summaries: Map<number, ElementSummaryResponse>,
  teamsById: Map<number, { short_name: string }>,
  activeChip: ActiveChip = null,
): TransformationPlan {
  const bank = resolved.bank ?? 0;
  const swaps = suggestSwaps(
    squad,
    shortlist,
    bootstrap,
    fixtures,
    fromEvent,
    bank,
    summaries,
    activeChip,
  );

  const bestXI = pickBestXI(squad, fixtures, fromEvent);
  const startingPlayers = squad.filter((p) => bestXI.startingIds.includes(p.id));
  const captainSuggestion = suggestCaptain(startingPlayers, fixtures, fromEvent, teamsById);
  const captainDiff = buildCaptainDiff(resolved, captainSuggestion);
  const lineupDiff = buildLineupDiff(squad, resolved, bestXI);
  const teamRating = computeTeamRating(squad, bootstrap, fixtures, fromEvent);
  const chipContext = buildChipContext(activeChip);

  return {
    swaps,
    captainDiff,
    captainBreakdown: captainSuggestion.breakdown.slice(0, CAPTAIN_PICKS_SHOWN),
    lineupDiff,
    teamRating,
    chipContext,
  };
}
