import { scoreForBuy } from "./analysis";
import { chipInstanceKey, isChipUsed, type ChipState } from "./chipStore";
import { findBlankEvents, findDoubleEvents, getFixtureCountsByEvent } from "./fdr";
import type { Chip, Fixture, Player } from "./types";

export interface ChipSuggestion {
  chip: "Wildcard" | "Free Hit" | "Bench Boost" | "Triple Captain";
  event: number | null;
  reason: string;
}

export const CHIP_HORIZON = 6;

export const CHIP_API_NAME: Record<ChipSuggestion["chip"], string> = {
  Wildcard: "wildcard",
  "Free Hit": "freehit",
  "Bench Boost": "bboost",
  "Triple Captain": "3xc",
};

export const CHIP_DISPLAY_NAME: Record<string, ChipSuggestion["chip"]> = {
  wildcard: "Wildcard",
  freehit: "Free Hit",
  bboost: "Bench Boost",
  "3xc": "Triple Captain",
};

/** Which real chip instance (half-season window) a chip name/event falls into, if any. */
export function findChipInstance(
  displayName: ChipSuggestion["chip"],
  event: number,
  chips: Chip[],
): Chip | null {
  const apiName = CHIP_API_NAME[displayName];
  return chips.find((c) => c.name === apiName && event >= c.start_event && event <= c.stop_event) ?? null;
}

export function isChipInstanceUsed(instance: Chip, state: ChipState): boolean {
  return isChipUsed(chipInstanceKey(instance.name, instance.start_event), state);
}

/**
 * Rule-based chip timing advisor. These are heuristics based on squad fixture
 * congestion/blanks and squad "health" (form + injuries) — not a solver, just
 * pointers to the windows worth looking at closely. Chips already marked used
 * (via the tracker on My Team) are filtered out rather than suggested again.
 */
export function getChipSuggestions(
  squad: Player[],
  fixtures: Fixture[],
  fromEvent: number,
  chips: Chip[] = [],
  chipState: ChipState = { usingKey: null, usingEvent: null, history: {} },
): ChipSuggestion[] {
  const suggestions: ChipSuggestion[] = [];
  const toEvent = fromEvent + CHIP_HORIZON - 1;

  const blankEventCounts = new Map<number, number>();
  const doubleEventCounts = new Map<number, number>();
  for (const p of squad) {
    const counts = getFixtureCountsByEvent(fixtures, p.team, fromEvent, toEvent);
    for (const ev of findBlankEvents(counts)) {
      blankEventCounts.set(ev, (blankEventCounts.get(ev) ?? 0) + 1);
    }
    for (const ev of findDoubleEvents(counts)) {
      doubleEventCounts.set(ev, (doubleEventCounts.get(ev) ?? 0) + 1);
    }
  }

  const worstBlank = [...blankEventCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (worstBlank && worstBlank[1] >= 3) {
    suggestions.push({
      chip: "Free Hit",
      event: worstBlank[0],
      reason: `${worstBlank[1]} of your 15 players have no fixture in GW${worstBlank[0]} (blank gameweek) — Free Hit lets you field a full XI just for that week without touching your real squad.`,
    });
  }

  const bestDouble = [...doubleEventCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (bestDouble && bestDouble[1] >= 4) {
    suggestions.push({
      chip: "Bench Boost",
      event: bestDouble[0],
      reason: `${bestDouble[1]} of your 15 players have a double gameweek in GW${bestDouble[0]} — a good window to Bench Boost since your bench should also return points.`,
    });
    suggestions.push({
      chip: "Triple Captain",
      event: bestDouble[0],
      reason: `GW${bestDouble[0]} is a double gameweek for much of your squad — consider Triple Captain on your best-fixture premium player that week instead of Bench Boost.`,
    });
  }

  const squadScores = squad.map((p) => scoreForBuy(p, fixtures, fromEvent, 4));
  const roughFixtures = squadScores.filter(
    (s) => s.avgFdr !== null && s.avgFdr >= 3.8,
  ).length;
  const unavailable = squad.filter(
    (p) => p.status !== "a" || (p.chance_of_playing_next_round ?? 100) < 75,
  ).length;
  if (roughFixtures >= 5 || unavailable >= 3) {
    suggestions.push({
      chip: "Wildcard",
      event: fromEvent,
      reason: `${roughFixtures} squad players face a tough run of fixtures and ${unavailable} are flagged for fitness/rotation — a good sign your squad needs a reset rather than single transfers.`,
    });
  }

  return suggestions.filter((s) => {
    if (s.event === null || chips.length === 0) return true;
    const instance = findChipInstance(s.chip, s.event, chips);
    return !instance || !isChipInstanceUsed(instance, chipState);
  });
}
