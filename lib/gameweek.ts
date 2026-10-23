import type { Bootstrap } from "./types";

/** Picks the gameweek to treat as "current" — falls back to the next upcoming one pre-season. */
export function resolveCurrentEventId(bootstrap: Bootstrap): number {
  const current = bootstrap.events.find((e) => e.is_current);
  if (current) return current.id;
  const next = bootstrap.events.find((e) => e.is_next);
  if (next) return next.id;
  return bootstrap.events[0]?.id ?? 1;
}

/** True once at least one gameweek has been played — before that, `form` is 0 for every player and isn't a real signal. */
export function hasSeasonStarted(bootstrap: Bootstrap): boolean {
  return bootstrap.events.some((e) => e.finished);
}
