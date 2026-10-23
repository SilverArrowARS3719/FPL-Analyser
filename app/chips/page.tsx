"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CHIP_DISPLAY_NAME, CHIP_HORIZON, getChipSuggestions, type ChipSuggestion } from "@/lib/chips";
import { chipInstanceKey, loadChipState } from "@/lib/chipStore";
import { GLASS_CARD, GLASS_CARD_STRONG, GLASS_PILL } from "@/lib/ui";
import { useMySquad } from "@/lib/useMySquad";

const CHIP_META: Record<
  ChipSuggestion["chip"],
  { code: string; gradient: string; glow: string; text: string }
> = {
  Wildcard: {
    code: "WC",
    gradient: "linear-gradient(150deg, #b79cff, #7c5cff)",
    glow: "rgba(124,92,255,0.55)",
    text: "#5a3fd6",
  },
  "Free Hit": {
    code: "FH",
    gradient: "linear-gradient(150deg, #7fe6f0, #2ec2d6)",
    glow: "rgba(46,194,214,0.55)",
    text: "#128294",
  },
  "Bench Boost": {
    code: "BB",
    gradient: "linear-gradient(150deg, #7de3ae, #22c08f)",
    glow: "rgba(34,192,143,0.55)",
    text: "#1a8f6b",
  },
  "Triple Captain": {
    code: "TC",
    gradient: "linear-gradient(150deg, #ffcf6b, #f5a623)",
    glow: "rgba(245,166,35,0.55)",
    text: "#a86a10",
  },
};

function ChipBadge({ chip, size = 12 }: { chip: ChipSuggestion["chip"]; size?: number }) {
  const meta = CHIP_META[chip];
  return (
    <span
      className="rounded-2xl flex items-center justify-center text-white font-bold shrink-0"
      style={{
        width: size * 4,
        height: size * 4,
        background: meta.gradient,
        boxShadow: `0 12px 26px -10px ${meta.glow}`,
        fontSize: size * 1.1,
      }}
    >
      {meta.code}
    </span>
  );
}

export default function ChipsPage() {
  const { resolved, loading, currentEvent, bootstrap, fixtures, needsOnboarding } =
    useMySquad();
  const chipState = useMemo(
    () =>
      currentEvent
        ? loadChipState(currentEvent)
        : { usingKey: null, usingEvent: null, history: {} },
    [currentEvent],
  );

  if (loading) return <p className="text-[#6c6482]">Loading…</p>;

  if (needsOnboarding || !resolved) {
    return (
      <div className={`max-w-lg mx-auto text-center py-12 px-8 space-y-4 rounded-[2rem] ${GLASS_CARD}`}>
        <p className="text-[#6c6482] text-sm">
          Set up your squad first to get chip timing suggestions.
        </p>
        <Link
          href="/onboarding"
          className="inline-block bg-gradient-to-br from-[var(--accent-from)] to-[var(--accent-to)] text-white font-medium px-5 py-2.5 rounded-full shadow-[0_12px_24px_-8px_rgba(var(--accent-rgb),0.6)]"
        >
          Build my squad
        </Link>
      </div>
    );
  }

  const squadPlayers = resolved.players.map((p) => p.player);
  const suggestions =
    fixtures && currentEvent && bootstrap
      ? getChipSuggestions(squadPlayers, fixtures, currentEvent, bootstrap.chips, chipState)
      : [];

  const usedChips = (bootstrap?.chips ?? []).filter(
    (c) => chipState.history[chipInstanceKey(c.name, c.start_event)] !== undefined,
  );
  const usingChip = (bootstrap?.chips ?? []).find(
    (c) => chipInstanceKey(c.name, c.start_event) === chipState.usingKey,
  );

  const sorted = [...suggestions].sort(
    (a, b) => (a.event ?? Infinity) - (b.event ?? Infinity),
  );
  const [hero, ...rest] = sorted;

  const timelineEvents = currentEvent
    ? Array.from({ length: CHIP_HORIZON }, (_, i) => currentEvent + i)
    : [];
  const eventsWithChip = new Map<number, ChipSuggestion["chip"][]>();
  for (const s of suggestions) {
    if (s.event === null) continue;
    eventsWithChip.set(s.event, [...(eventsWithChip.get(s.event) ?? []), s.chip]);
  }

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl px-5 py-4 ${GLASS_PILL}`}>
        <h1 className="text-xl font-semibold text-[#251f38]">Chip Advisor</h1>
        <p className="text-sm text-[#6c6482] mt-0.5">
          When to play Wildcard, Free Hit, Bench Boost, or Triple Captain —
          based on your squad&apos;s fixtures over the next {CHIP_HORIZON}{" "}
          gameweeks. A starting point, not a solver.
        </p>
        {usingChip && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white rounded-full px-3 py-1"
            style={{ background: "linear-gradient(135deg, var(--accent-from), var(--accent-to))" }}
          >
            Using {CHIP_DISPLAY_NAME[usingChip.name] ?? usingChip.name} this gameweek
          </div>
        )}
        {usedChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {usedChips.map((c) => (
              <span
                key={chipInstanceKey(c.name, c.start_event)}
                className="text-[11px] font-medium bg-white/70 border border-white/70 text-[#6c6482] rounded-full px-2 py-0.5"
              >
                {CHIP_DISPLAY_NAME[c.name] ?? c.name} already used in GW
                {chipState.history[chipInstanceKey(c.name, c.start_event)]}
              </span>
            ))}
          </div>
        )}
      </div>

      {timelineEvents.length > 0 && (
        <div className={`rounded-2xl px-5 py-4 ${GLASS_CARD}`}>
          <div className="text-xs font-semibold uppercase tracking-wider text-[#6c6482] mb-3">
            Next {CHIP_HORIZON} gameweeks
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            {timelineEvents.map((ev) => {
              const chipsHere = eventsWithChip.get(ev) ?? [];
              return (
                <div key={ev} className="flex flex-col items-center gap-1.5 shrink-0">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-semibold border ${
                      chipsHere.length > 0
                        ? "border-white/80 text-white"
                        : "border-white/70 bg-white/50 text-[#6c6482]"
                    }`}
                    style={
                      chipsHere.length > 0
                        ? {
                            background: CHIP_META[chipsHere[0]].gradient,
                            boxShadow: `0 10px 22px -10px ${CHIP_META[chipsHere[0]].glow}`,
                          }
                        : undefined
                    }
                  >
                    {ev}
                  </div>
                  <span className="text-[10px] text-[#6c6482]">
                    {chipsHere.length > 0 ? CHIP_META[chipsHere[0]].code : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!hero && (
        <div className={`rounded-2xl px-6 py-10 text-center ${GLASS_CARD}`}>
          <p className="text-[#251f38] font-medium">Nothing stands out yet</p>
          <p className="text-sm text-[#6c6482] mt-1">
            No blank/double gameweek or fixture swing detected for your squad
            in the next {CHIP_HORIZON} gameweeks. Check back closer to the
            deadline.
          </p>
        </div>
      )}

      {hero && (
        <div
          className={`rounded-[1.75rem] p-6 flex items-start gap-5 ${GLASS_CARD_STRONG}`}
        >
          <ChipBadge chip={hero.chip} size={16} />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6c6482]">
                Next up
              </span>
              {hero.event && (
                <span className="text-xs font-medium bg-white/70 border border-white/70 rounded-full px-2 py-0.5 text-[#251f38]">
                  Gameweek {hero.event}
                </span>
              )}
            </div>
            <h2
              className="text-2xl font-bold mt-1"
              style={{ color: CHIP_META[hero.chip].text }}
            >
              {hero.chip}
            </h2>
            <p className="text-sm text-[#251f38]/80 mt-2 leading-relaxed">
              {hero.reason}
            </p>
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {rest.map((s, i) => (
            <div key={i} className={`rounded-2xl p-5 flex items-start gap-4 ${GLASS_CARD}`}>
              <ChipBadge chip={s.chip} size={10} />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold" style={{ color: CHIP_META[s.chip].text }}>
                    {s.chip}
                  </h3>
                  {s.event && (
                    <span className="text-[11px] font-medium bg-white/70 border border-white/70 rounded-full px-2 py-0.5 text-[#251f38]">
                      GW{s.event}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#251f38]/75 mt-1.5 leading-relaxed">
                  {s.reason}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
