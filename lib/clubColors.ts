// Deterministic per-team accent color, not tied to any club's real branding.
const PALETTE = [
  "#ff8a65", "#ffb74d", "#ffd54f", "#aed581", "#4fd1c5",
  "#4fc3f7", "#7986cb", "#ba68c8", "#f06292", "#a1887f",
  "#90a4ae", "#81c784",
];

export function colorForTeam(teamId: number): string {
  return PALETTE[teamId % PALETTE.length];
}
