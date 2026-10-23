"use client";

const CHIP_STORAGE_KEY = "fpl-analyser-chip-state-v2";

/** Keyed by `${chip.name}-${chip.start_event}` — each chip (wildcard, freehit, bboost, 3xc) has one instance per half-season. */
export interface ChipState {
  usingKey: string | null;
  usingEvent: number | null;
  history: Record<string, number>;
}

const EMPTY_STATE: ChipState = { usingKey: null, usingEvent: null, history: {} };

export function chipInstanceKey(name: string, startEvent: number): string {
  return `${name}-${startEvent}`;
}

function readRaw(): ChipState {
  if (typeof window === "undefined") return EMPTY_STATE;
  const raw = window.localStorage.getItem(CHIP_STORAGE_KEY);
  if (!raw) return EMPTY_STATE;
  try {
    return { ...EMPTY_STATE, ...(JSON.parse(raw) as Partial<ChipState>) };
  } catch {
    return EMPTY_STATE;
  }
}

function writeRaw(state: ChipState): void {
  window.localStorage.setItem(CHIP_STORAGE_KEY, JSON.stringify(state));
}

/** Reads chip state, auto-filing a stale "using" pick into history once its gameweek has passed. */
export function loadChipState(currentEvent: number): ChipState {
  const state = readRaw();
  if (state.usingKey && state.usingEvent !== null && currentEvent > state.usingEvent) {
    const migrated: ChipState = {
      usingKey: null,
      usingEvent: null,
      history: { ...state.history, [state.usingKey]: state.usingEvent },
    };
    writeRaw(migrated);
    return migrated;
  }
  return state;
}

/** Only one chip can be active per gameweek in real FPL — selecting one clears any other. Pass null to clear. */
export function setUsingChip(key: string | null, event: number): ChipState {
  const state = readRaw();
  const next: ChipState = { ...state, usingKey: key, usingEvent: key ? event : null };
  writeRaw(next);
  return next;
}

export function isChipUsed(key: string, state: ChipState): boolean {
  return state.history[key] !== undefined;
}
