"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { LiveElement } from "@/lib/types";
import { GLASS_CARD, GLASS_PILL } from "@/lib/ui";
import { useEventLive, useFixtures } from "@/lib/useFplData";
import { useMySquad } from "@/lib/useMySquad";

export default function LivePage() {
  const { resolved, loading, currentEvent, teamsById, needsOnboarding } =
    useMySquad();
  const { data: allFixtures } = useFixtures();
  const { data: live, loading: liveLoading } = useEventLive(currentEvent);

  const gwFixtures = useMemo(
    () => (allFixtures ?? []).filter((f) => f.event === currentEvent),
    [allFixtures, currentEvent],
  );

  const liveById = useMemo(() => {
    const map = new Map<number, LiveElement>();
    live?.elements.forEach((e) => map.set(e.id, e));
    return map;
  }, [live]);

  if (loading) return <p className="text-[#6c6482]">Loading…</p>;

  if (needsOnboarding || !resolved) {
    return (
      <div className={`max-w-lg mx-auto text-center py-12 px-8 space-y-4 rounded-[2rem] ${GLASS_CARD}`}>
        <p className="text-[#6c6482] text-sm">
          Set up your squad first to see live gameweek stats.
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

  const anyInPlay = gwFixtures.some((f) => f.started && !f.finished);
  const totalLivePoints = resolved.players
    .filter((rp) => rp.isStarting)
    .reduce((sum, rp) => {
      const stats = liveById.get(rp.player.id)?.stats;
      if (!stats) return sum;
      const multiplier = rp.isCaptain ? 2 : 1;
      return sum + stats.total_points * multiplier;
    }, 0);

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl px-5 py-4 flex items-center justify-between flex-wrap gap-3 ${GLASS_PILL}`}>
        <div>
          <h1 className="text-xl font-semibold text-[#251f38]">
            Live — Gameweek {currentEvent}
          </h1>
          <p className="text-sm text-[#6c6482] mt-0.5 flex items-center gap-2">
            {anyInPlay && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-to)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-to)]" />
              </span>
            )}
            {liveLoading
              ? "Loading live stats…"
              : anyInPlay
                ? "Matches in progress"
                : "No matches currently in progress"}
          </p>
        </div>
        {live && (
          <div className="text-right">
            <div className="text-2xl font-bold text-[#251f38] tabular-nums">
              {totalLivePoints}
            </div>
            <div className="text-xs text-[#6c6482]">Starting XI points</div>
          </div>
        )}
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold text-[#251f38] px-1">Fixtures</h2>
        <div className="grid sm:grid-cols-2 gap-2.5">
          {gwFixtures.map((f) => {
            const inPlay = f.started && !f.finished;
            return (
              <div
                key={f.id}
                className={`rounded-xl px-4 py-3 flex items-center justify-between text-sm ${GLASS_CARD}`}
              >
                <span className="font-medium text-[#251f38] w-12">
                  {teamsById.get(f.team_h)?.short_name ?? "?"}
                </span>
                <span className="font-semibold tabular-nums text-[#251f38]">
                  {f.team_h_score ?? "-"} : {f.team_a_score ?? "-"}
                </span>
                <span className="font-medium text-[#251f38] w-12 text-right">
                  {teamsById.get(f.team_a)?.short_name ?? "?"}
                </span>
                <span
                  className={`text-xs w-20 text-right font-medium ${
                    inPlay ? "text-[var(--accent-to)]" : "text-[#6c6482]"
                  }`}
                >
                  {f.finished ? "FT" : f.started ? `${f.minutes}'` : "Not started"}
                </span>
              </div>
            );
          })}
          {gwFixtures.length === 0 && (
            <p className="text-sm text-[#6c6482]">No fixtures found for this gameweek.</p>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-[#251f38] px-1">Your squad — live points</h2>
        <div className={`overflow-x-auto rounded-2xl ${GLASS_CARD}`}>
          <table className="w-full text-sm">
            <thead className="text-[#6c6482] text-xs uppercase border-b border-white/60">
              <tr>
                <th className="text-left px-4 py-3">Player</th>
                <th className="text-right px-4 py-3">Mins</th>
                <th className="text-right px-4 py-3">G</th>
                <th className="text-right px-4 py-3">A</th>
                <th className="text-right px-4 py-3">Bonus</th>
                <th className="text-right px-4 py-3">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/50">
              {resolved.players.map((rp) => {
                const stats = liveById.get(rp.player.id)?.stats;
                const multiplier = rp.isCaptain ? 2 : 1;
                return (
                  <tr
                    key={rp.player.id}
                    className={rp.isStarting ? "" : "opacity-45"}
                  >
                    <td className="px-4 py-3 text-[#251f38]">
                      {rp.player.web_name}
                      {rp.isCaptain && (
                        <span className="ml-1 text-[#f5a623] text-xs font-semibold">(C)</span>
                      )}
                      {rp.isViceCaptain && (
                        <span className="ml-1 text-[#6c6482] text-xs font-semibold">(V)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-[#251f38]">{stats?.minutes ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-[#251f38]">{stats?.goals_scored ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-[#251f38]">{stats?.assists ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-[#251f38]">{stats?.bonus ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#251f38]">
                      {stats ? stats.total_points * (rp.isStarting ? multiplier : 1) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
