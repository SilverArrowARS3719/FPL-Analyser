import type { Player } from "./types";

export interface PriceMover {
  player: Player;
  net: number;
}

export interface PriceWatch {
  risers: PriceMover[];
  fallers: PriceMover[];
}

/**
 * Real-data early warning for imminent FPL price changes, from today's net
 * transfer momentum (`transfers_in_event` - `transfers_out_event`). FPL doesn't
 * publish its price-change algorithm, so this is a signal, not a guarantee —
 * but strong net movement is the same signal every price-tracker site uses.
 */
export function getPriceWatch(players: Player[], limit = 5): PriceWatch {
  const moversWithNet = players
    .filter((p) => p.status === "a")
    .map((p) => ({ player: p, net: p.transfers_in_event - p.transfers_out_event }));

  const risers = [...moversWithNet]
    .filter((m) => m.net > 0)
    .sort((a, b) => b.net - a.net)
    .slice(0, limit);

  const fallers = [...moversWithNet]
    .filter((m) => m.net < 0)
    .sort((a, b) => a.net - b.net)
    .slice(0, limit);

  return { risers, fallers };
}

export const formatNet = (net: number) => (net > 0 ? `+${net.toLocaleString()}` : net.toLocaleString());
