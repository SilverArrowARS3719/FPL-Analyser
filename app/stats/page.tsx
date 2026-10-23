"use client";

import { useMemo, useState } from "react";
import {
  form,
  goalsPlusAssists,
  pointsPerMillion,
  price,
  xgi,
} from "@/lib/analysis";
import { averageFdr, getUpcomingFixtures } from "@/lib/fdr";
import { resolveCurrentEventId } from "@/lib/gameweek";
import { formatNet, getPriceWatch } from "@/lib/priceWatch";
import { matchesSearch } from "@/lib/textSearch";
import { POSITION, type Player } from "@/lib/types";
import { GLASS_CARD, GLASS_PILL } from "@/lib/ui";
import { useBootstrap, useFixtures } from "@/lib/useFplData";

const POSITION_LABEL: Record<number, string> = {
  [POSITION.GKP]: "GKP",
  [POSITION.DEF]: "DEF",
  [POSITION.MID]: "MID",
  [POSITION.FWD]: "FWD",
};

interface Row {
  player: Player;
  team: string;
  price: number;
  totalPoints: number;
  form: number;
  ga: number;
  xgi: number;
  ict: number;
  ownership: number;
  ppm: number;
  avgFdr: number | null;
}

type SortKey = keyof Omit<Row, "player" | "team">;

const COLUMNS: { key: SortKey; label: string; format: (v: number) => string }[] = [
  { key: "price", label: "Price", format: (v) => `£${v.toFixed(1)}m` },
  { key: "totalPoints", label: "Points", format: (v) => `${v}` },
  { key: "form", label: "Form", format: (v) => v.toFixed(1) },
  { key: "ga", label: "G+A", format: (v) => `${v}` },
  { key: "xgi", label: "xGI", format: (v) => v.toFixed(2) },
  { key: "ict", label: "ICT", format: (v) => v.toFixed(1) },
  { key: "ownership", label: "Owned %", format: (v) => `${v.toFixed(1)}%` },
  { key: "ppm", label: "Pts/£m", format: (v) => v.toFixed(1) },
  { key: "avgFdr", label: "Avg FDR (5)", format: (v) => v.toFixed(1) },
];

export default function StatsPage() {
  const { data: bootstrap, loading } = useBootstrap();
  const { data: fixtures } = useFixtures();
  const [posFilter, setPosFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("totalPoints");
  const [sortDesc, setSortDesc] = useState(true);

  const teamsById = useMemo(() => {
    const map = new Map<number, { short_name: string }>();
    bootstrap?.teams.forEach((t) => map.set(t.id, t));
    return map;
  }, [bootstrap]);

  const rows: Row[] = useMemo(() => {
    if (!bootstrap || !fixtures) return [];
    const currentEvent = resolveCurrentEventId(bootstrap);
    return bootstrap.elements.map((p) => {
      const upcoming = getUpcomingFixtures(fixtures, p.team, currentEvent, 5);
      return {
        player: p,
        team: teamsById.get(p.team)?.short_name ?? "?",
        price: price(p),
        totalPoints: p.total_points,
        form: form(p),
        ga: goalsPlusAssists(p),
        xgi: xgi(p),
        ict: Number.parseFloat(p.ict_index) || 0,
        ownership: Number.parseFloat(p.selected_by_percent) || 0,
        ppm: pointsPerMillion(p),
        avgFdr: averageFdr(upcoming),
      };
    });
  }, [bootstrap, fixtures, teamsById]);

  const priceWatch = useMemo(
    () => (bootstrap ? getPriceWatch(bootstrap.elements, 5) : { risers: [], fallers: [] }),
    [bootstrap],
  );

  const filtered = rows
    .filter((r) => (posFilter ? r.player.element_type === posFilter : true))
    .filter(
      (r) =>
        matchesSearch(r.player.web_name, search) ||
        matchesSearch(`${r.player.first_name} ${r.player.second_name}`, search),
    )
    .sort((a, b) => {
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      return sortDesc ? bv - av : av - bv;
    })
    .slice(0, 100);

  function onSort(key: SortKey) {
    if (key === sortKey) {
      setSortDesc(!sortDesc);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  }

  if (loading) return <p className="text-[#6c6482]">Loading players…</p>;

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl px-5 py-4 ${GLASS_PILL}`}>
        <h1 className="text-xl font-semibold text-[#251f38]">Player Stats</h1>
        <p className="text-sm text-[#6c6482] mt-0.5">
          Goals + assists and expected goal involvement (xGI) side by side.
          Click a column to sort.
        </p>
      </div>

      {(priceWatch.risers.length > 0 || priceWatch.fallers.length > 0) && (
        <section className="space-y-2">
          <h2 className="font-semibold text-[#251f38] px-1">Price Watch</h2>
          <p className="text-xs text-[#6c6482] px-1 -mt-1">
            Today&apos;s net transfer momentum — the same signal every price-change
            tracker uses. Not a guarantee, but strong movement usually means a change
            is close.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className={`rounded-2xl p-4 ${GLASS_CARD}`}>
              <div className="text-xs font-semibold uppercase tracking-wider text-[#1a8f6b] mb-2">
                Likely to rise
              </div>
              <div className="space-y-1.5">
                {priceWatch.risers.map((m) => (
                  <div key={m.player.id} className="flex items-center justify-between text-sm">
                    <span className="text-[#251f38] font-medium">{m.player.web_name}</span>
                    <span className="text-[#1a8f6b] font-medium tabular-nums">
                      {formatNet(m.net)}
                    </span>
                  </div>
                ))}
                {priceWatch.risers.length === 0 && (
                  <p className="text-sm text-[#6c6482]">No strong risers right now.</p>
                )}
              </div>
            </div>
            <div className={`rounded-2xl p-4 ${GLASS_CARD}`}>
              <div className="text-xs font-semibold uppercase tracking-wider text-[#c94f3f] mb-2">
                Likely to fall
              </div>
              <div className="space-y-1.5">
                {priceWatch.fallers.map((m) => (
                  <div key={m.player.id} className="flex items-center justify-between text-sm">
                    <span className="text-[#251f38] font-medium">{m.player.web_name}</span>
                    <span className="text-[#c94f3f] font-medium tabular-nums">
                      {formatNet(m.net)}
                    </span>
                  </div>
                ))}
                {priceWatch.fallers.length === 0 && (
                  <p className="text-sm text-[#6c6482]">No strong fallers right now.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="flex gap-2 flex-wrap items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search player…"
          className="bg-white/60 border border-white/70 rounded-full px-4 py-1.5 text-sm min-w-[160px] placeholder:text-[#6c6482]/70 focus:outline-none focus:ring-2 focus:ring-[var(--accent-from)]"
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

      <div className={`overflow-x-auto rounded-2xl ${GLASS_CARD}`}>
        <table className="w-full text-sm">
          <thead className="text-[#6c6482] text-xs uppercase border-b border-white/60">
            <tr>
              <th className="text-left px-4 py-3">Player</th>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  onClick={() => onSort(c.key)}
                  className="text-right px-4 py-3 cursor-pointer hover:text-[#251f38] select-none transition-colors"
                >
                  {c.label}
                  {sortKey === c.key ? (sortDesc ? " ↓" : " ↑") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/50">
            {filtered.map((r) => (
              <tr key={r.player.id} className="hover:bg-white/40 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-medium text-[#251f38]">{r.player.web_name}</span>{" "}
                  <span className="text-[#6c6482] text-xs">
                    {r.team} · {POSITION_LABEL[r.player.element_type]}
                  </span>
                </td>
                {COLUMNS.map((c) => (
                  <td key={c.key} className="px-4 py-3 text-right text-[#251f38]">
                    {r[c.key] !== null ? c.format(r[c.key] as number) : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
