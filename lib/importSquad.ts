import { normalizeSearchText } from "./textSearch";
import type { Player } from "./types";

export interface OcrMatch {
  player: Player;
  matchedText: string;
  confidence: number; // 0..1, combines OCR confidence and name-similarity
}

function normalize(s: string): string {
  return normalizeSearchText(s).replace(/[^a-z]/g, "");
}

/** Plain Levenshtein edit distance — short strings only, no need for a library. */
function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[rows - 1][cols - 1];
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  return 1 - levenshtein(na, nb) / Math.max(na.length, nb.length);
}

export interface OcrTextBlock {
  text: string;
  confidence: number; // 0..100, as reported by the OCR engine
}

const MIN_TEXT_LENGTH = 3;
const MATCH_THRESHOLD = 0.72;

/**
 * Matches raw OCR text blocks (player-name labels, but also noise — team codes,
 * prices, "Bench", opponent tags, etc.) against the real player list. Only
 * reasonably confident, reasonably long matches survive — everything else is
 * assumed to be UI chrome, not a player name.
 */
export function matchOcrTextToPlayers(
  blocks: OcrTextBlock[],
  players: Player[],
): OcrMatch[] {
  const bestByPlayer = new Map<number, OcrMatch>();

  for (const block of blocks) {
    const cleaned = block.text.trim();
    if (normalize(cleaned).length < MIN_TEXT_LENGTH) continue;

    let best: { player: Player; score: number } | null = null;
    for (const p of players) {
      const score = Math.max(similarity(cleaned, p.web_name), similarity(cleaned, p.second_name));
      if (score >= MATCH_THRESHOLD && (!best || score > best.score)) {
        best = { player: p, score };
      }
    }
    if (!best) continue;

    const combined = best.score * (block.confidence / 100);
    const existing = bestByPlayer.get(best.player.id);
    if (!existing || combined > existing.confidence) {
      bestByPlayer.set(best.player.id, {
        player: best.player,
        matchedText: cleaned,
        confidence: combined,
      });
    }
  }

  return [...bestByPlayer.values()].sort((a, b) => b.confidence - a.confidence);
}
