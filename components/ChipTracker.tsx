"use client";

import { useState } from "react";
import { CHIP_DISPLAY_NAME } from "@/lib/chips";
import {
  chipInstanceKey,
  isChipUsed,
  loadChipState,
  setUsingChip,
  type ChipState,
} from "@/lib/chipStore";
import type { Chip } from "@/lib/types";
import { GLASS_CARD } from "@/lib/ui";

function halfLabel(chip: Chip): string {
  return `GW${chip.start_event}–${chip.stop_event}`;
}

export function ChipTracker({ chips, currentEvent }: { chips: Chip[]; currentEvent: number }) {
  const [state, setState] = useState<ChipState>(() => loadChipState(currentEvent));

  const grouped = new Map<string, Chip[]>();
  for (const chip of chips) {
    const label = CHIP_DISPLAY_NAME[chip.name] ?? chip.name;
    grouped.set(label, [...(grouped.get(label) ?? []), chip]);
  }

  function handleClick(chip: Chip) {
    const key = chipInstanceKey(chip.name, chip.start_event);
    if (isChipUsed(key, state)) return;
    const isActive = state.usingKey === key;
    setState(setUsingChip(isActive ? null : key, currentEvent));
  }

  if (grouped.size === 0) return null;

  return (
    <div className={`rounded-2xl p-4 ${GLASS_CARD}`}>
      <div className="text-xs font-semibold uppercase tracking-wider text-[#6c6482] mb-1">
        Chips — click to mark as using this gameweek
      </div>
      <p className="text-[11px] text-[#6c6482] mb-3">
        Selecting a chip reshapes your Transformation suggestions around it. Only one
        chip can be active per gameweek — picking a new one clears the last.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {[...grouped.entries()].map(([label, instances]) => (
          <div key={label} className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-[#251f38]">{label}</span>
            <div className="flex gap-1.5">
              {instances.map((chip) => {
                const key = chipInstanceKey(chip.name, chip.start_event);
                const used = isChipUsed(key, state);
                const active = state.usingKey === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleClick(chip)}
                    disabled={used}
                    title={
                      used
                        ? `Already used in GW${state.history[key]}`
                        : active
                          ? `Using this gameweek (GW${currentEvent}) — click to clear`
                          : `Mark as using (${halfLabel(chip)})`
                    }
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                      used
                        ? "bg-white/40 text-[#a39cb8] border-white/50 line-through cursor-not-allowed"
                        : active
                          ? "text-white border-transparent shadow-[0_6px_16px_-4px_rgba(var(--accent-rgb),0.6)]"
                          : "bg-white/60 text-[#6c6482] border-white/70 hover:bg-white/90"
                    }`}
                    style={
                      active
                        ? {
                            background:
                              "linear-gradient(135deg, var(--accent-from), var(--accent-to))",
                          }
                        : undefined
                    }
                  >
                    {active ? `Using · ${halfLabel(chip)}` : halfLabel(chip)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
