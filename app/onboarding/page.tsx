"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SquadImport } from "@/components/SquadImport";
import { pickBestXI, price, suggestCaptain } from "@/lib/analysis";
import { STARTING_BUDGET } from "@/lib/constants";
import { resolveCurrentEventId } from "@/lib/gameweek";
import type { OcrMatch } from "@/lib/importSquad";
import { loadSquad, saveSquad } from "@/lib/squadStore";
import { matchesSearch } from "@/lib/textSearch";
import { POSITION, type Player } from "@/lib/types";
import { GLASS_CARD, GLASS_PILL } from "@/lib/ui";
import { useBootstrap, useFixtures } from "@/lib/useFplData";

const TARGET: Record<number, number> = {
  [POSITION.GKP]: 2,
  [POSITION.DEF]: 5,
  [POSITION.MID]: 5,
  [POSITION.FWD]: 3,
};

const POSITION_LABEL: Record<number, string> = {
  [POSITION.GKP]: "GKP",
  [POSITION.DEF]: "DEF",
  [POSITION.MID]: "MID",
  [POSITION.FWD]: "FWD",
};

export default function OnboardingPage() {
  const { data: bootstrap, loading } = useBootstrap();
  const { data: fixtures } = useFixtures();
  const router = useRouter();

  const [selected, setSelected] = useState<number[]>(() =>
    typeof window !== "undefined"
      ? (loadSquad()?.picks.map((p) => p.elementId) ?? [])
      : [],
  );
  const [posFilter, setPosFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const teamsById = useMemo(() => {
    const map = new Map<number, { short_name: string }>();
    bootstrap?.teams.forEach((t) => map.set(t.id, t));
    return map;
  }, [bootstrap]);

  const elementsById = useMemo(() => {
    const map = new Map<number, Player>();
    bootstrap?.elements.forEach((e) => map.set(e.id, e));
    return map;
  }, [bootstrap]);

  const selectedPlayers = selected
    .map((id) => elementsById.get(id))
    .filter((p): p is Player => !!p);

  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let totalSpent = 0;
  for (const p of selectedPlayers) {
    counts[p.element_type] = (counts[p.element_type] ?? 0) + 1;
    totalSpent += price(p);
  }
  const remaining = STARTING_BUDGET - totalSpent;
  const isValid =
    selected.length === 15 &&
    Object.entries(TARGET).every(([pos, n]) => counts[Number(pos)] === n) &&
    remaining >= 0;

  const list = (bootstrap?.elements ?? [])
    .filter((p) => (posFilter ? p.element_type === posFilter : true))
    .filter(
      (p) =>
        matchesSearch(p.web_name, search) ||
        matchesSearch(`${p.first_name} ${p.second_name}`, search),
    )
    .sort((a, b) => b.total_points - a.total_points)
    .slice(0, 60);

  function handleImportMatches(matches: OcrMatch[]) {
    const newCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    let newSpent = 0;
    const newSelected: number[] = [];
    for (const { player: p } of matches) {
      if (newSelected.length >= 15) break;
      if ((newCounts[p.element_type] ?? 0) >= TARGET[p.element_type]) continue;
      if (newSpent + price(p) > STARTING_BUDGET) continue;
      newSelected.push(p.id);
      newCounts[p.element_type] = (newCounts[p.element_type] ?? 0) + 1;
      newSpent += price(p);
    }
    setSelected(newSelected);
  }

  function toggle(p: Player) {
    if (selected.includes(p.id)) {
      setSelected(selected.filter((id) => id !== p.id));
      return;
    }
    if (selected.length >= 15) return;
    if ((counts[p.element_type] ?? 0) >= TARGET[p.element_type]) return;
    if (price(p) > remaining) return;
    setSelected([...selected, p.id]);
  }

  function handleSave() {
    if (!isValid || !fixtures || !bootstrap) return;
    const currentEvent = resolveCurrentEventId(bootstrap);
    const { startingIds } = pickBestXI(selectedPlayers, fixtures, currentEvent);
    const startingPlayers = selectedPlayers.filter((p) =>
      startingIds.includes(p.id),
    );
    const { captainId, viceCaptainId } = suggestCaptain(
      startingPlayers,
      fixtures,
      currentEvent,
      teamsById,
    );
    saveSquad({
      bank: remaining,
      picks: selectedPlayers.map((p) => ({
        elementId: p.id,
        isCaptain: p.id === captainId,
        isViceCaptain: p.id === viceCaptainId,
        isStarting: startingIds.includes(p.id),
      })),
    });
    router.push("/team");
  }

  if (loading) return <p className="text-[#6c6482]">Loading players…</p>;

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl px-5 py-4 ${GLASS_PILL}`}>
        <h1 className="text-xl font-semibold text-[#251f38]">Build your squad</h1>
        <p className="text-sm text-[#6c6482] mt-0.5">
          Pick 15 players within a £{STARTING_BUDGET.toFixed(1)}m budget: 2
          GKP, 5 DEF, 5 MID, 3 FWD. We&apos;ll auto-set your starting XI,
          bench order, and captain — you can re-run this anytime pre-season.
        </p>
      </div>

      {bootstrap && (
        <SquadImport players={bootstrap.elements} onImport={handleImportMatches} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search player…"
              className="bg-white/60 border border-white/70 rounded-full px-4 py-1.5 text-sm flex-1 min-w-[160px] placeholder:text-[#6c6482]/70 focus:outline-none focus:ring-2 focus:ring-[var(--accent-from)]"
            />
            {[null, POSITION.GKP, POSITION.DEF, POSITION.MID, POSITION.FWD].map(
              (pos) => (
                <button
                  key={pos ?? "all"}
                  onClick={() => setPosFilter(pos)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                    posFilter === pos
                      ? "bg-[#251f38] text-white"
                      : "bg-white/60 text-[#6c6482] border border-white/70 hover:bg-white/90"
                  }`}
                >
                  {pos ? POSITION_LABEL[pos] : "All"}
                </button>
              ),
            )}
          </div>
          <div className={`rounded-2xl divide-y divide-white/50 max-h-[600px] overflow-y-auto ${GLASS_CARD}`}>
            {list.map((p) => {
              const isSelected = selected.includes(p.id);
              const full =
                !isSelected &&
                ((counts[p.element_type] ?? 0) >= TARGET[p.element_type] ||
                  price(p) > remaining ||
                  selected.length >= 15);
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p)}
                  disabled={full}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors first:rounded-t-2xl last:rounded-b-2xl ${
                    isSelected
                      ? "bg-[#ffe4da]/70"
                      : full
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-white/50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-[#6c6482] w-9 font-medium">
                      {POSITION_LABEL[p.element_type]}
                    </span>
                    <span className="font-medium text-[#251f38]">{p.web_name}</span>
                    <span className="text-xs text-[#6c6482]">
                      {teamsById.get(p.team)?.short_name}
                    </span>
                  </span>
                  <span className="text-[#6c6482] font-medium">£{price(p).toFixed(1)}m</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className={`rounded-2xl p-4 space-y-3 sticky top-24 ${GLASS_CARD}`}>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-[#6c6482]">Selected</span>
              <span className="text-lg font-semibold text-[#251f38]">{selected.length} / 15</span>
            </div>
            <div className="flex justify-between text-sm items-baseline">
              <span className="text-[#6c6482]">Budget remaining</span>
              <span className={`font-semibold ${remaining < 0 ? "text-[var(--accent-to)]" : "text-[#1a8f6b]"}`}>
                £{remaining.toFixed(1)}m
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs text-center">
              {Object.entries(TARGET).map(([pos, n]) => {
                const count = counts[Number(pos)];
                const done = count === n;
                return (
                  <div key={pos}>
                    <div className="text-[#6c6482] font-medium mb-1">{POSITION_LABEL[Number(pos)]}</div>
                    <div className="h-1.5 rounded-full bg-white/70 overflow-hidden mb-1">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (count / n) * 100)}%`,
                          background: done
                            ? "linear-gradient(90deg, #7de3ae, #22c08f)"
                            : "linear-gradient(90deg, #ffb37a, #ff8a5c)",
                        }}
                      />
                    </div>
                    <span className={done ? "text-[#1a8f6b] font-semibold" : "text-[#251f38]"}>
                      {count}/{n}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-white/50 border-t border-white/50 pt-2">
              {selectedPlayers.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center py-1.5 text-sm"
                >
                  <span className="text-[#251f38]">{p.web_name}</span>
                  <button
                    onClick={() => toggle(p)}
                    className="text-[var(--accent-to)] text-xs font-medium hover:text-[var(--accent-hover)]"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={handleSave}
              disabled={!isValid}
              className="w-full bg-gradient-to-br from-[var(--accent-from)] to-[var(--accent-to)] disabled:from-[#e4e0f0] disabled:to-[#e4e0f0] disabled:text-[#a39cb8] disabled:shadow-none disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-full text-sm mt-1 shadow-[0_12px_24px_-8px_rgba(var(--accent-rgb),0.6)] active:scale-[0.98] transition-all"
            >
              Save squad
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
