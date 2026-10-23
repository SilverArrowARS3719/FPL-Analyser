"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  form,
  goalsPlusAssists,
  price,
  rankBuyCandidates,
  xgi,
} from "@/lib/analysis";
import { CHIP_DISPLAY_NAME } from "@/lib/chips";
import { chipInstanceKey, loadChipState } from "@/lib/chipStore";
import { colorForTeam } from "@/lib/clubColors";
import { POSITION } from "@/lib/types";
import {
  INITIAL_VISIBLE_SWAPS,
  buildShortlist,
  buildTransformationPlan,
  type LineupPair,
  type SwapSuggestion,
} from "@/lib/transformation";
import { GLASS_CARD, GLASS_CARD_STRONG, GLASS_PILL } from "@/lib/ui";
import { useElementSummaries } from "@/lib/useFplData";
import { useMySquad } from "@/lib/useMySquad";

const POSITION_LABEL: Record<number, string> = {
  [POSITION.GKP]: "GKP",
  [POSITION.DEF]: "DEF",
  [POSITION.MID]: "MID",
  [POSITION.FWD]: "FWD",
};

const VISIBLE_STEP = 5;

function SignalPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block bg-white/70 border border-white/70 text-[#6c6482] text-[11px] font-medium px-2 py-0.5 rounded-full">
      {children}
    </span>
  );
}

function MiniAvatar({ teamId, name }: { teamId: number; name: string }) {
  return (
    <div className="flex flex-col items-center gap-1 w-16">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs ring-2 ring-white/60"
        style={{
          backgroundColor: colorForTeam(teamId),
          backgroundImage:
            "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.85), rgba(255,255,255,0) 45%), radial-gradient(circle at 72% 82%, rgba(0,0,0,0.28), rgba(0,0,0,0) 60%)",
        }}
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
      <span className="text-[11px] font-medium text-[#251f38] text-center truncate w-full">
        {name}
      </span>
    </div>
  );
}

function TransferCard({
  swap,
  teamsById,
}: {
  swap: SwapSuggestion;
  teamsById: Map<number, { short_name: string }>;
}) {
  return (
    <div
      className={`rounded-[1.5rem] p-5 ${GLASS_CARD_STRONG} ${
        swap.priority === "optional" ? "opacity-90" : ""
      }`}
    >
      {swap.priority === "optional" && (
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6c6482] text-center mb-2">
          Optional upgrade
        </div>
      )}
      <div className="flex items-center justify-center gap-4">
        <MiniAvatar teamId={swap.out.team} name={swap.out.web_name} />
        <div className="flex flex-col items-center text-[var(--accent-to)]">
          <span className="text-lg">→</span>
          <span className="text-[10px] font-medium text-[#6c6482]">
            {swap.costDelta === 0
              ? "same price"
              : `${swap.costDelta > 0 ? "+" : ""}£${swap.costDelta.toFixed(1)}m`}
          </span>
        </div>
        <MiniAvatar teamId={swap.in.team} name={swap.in.web_name} />
      </div>
      <p className="text-sm text-[#251f38]/85 mt-4 leading-relaxed text-center">
        {swap.rationale}
      </p>
      <div className="flex flex-wrap justify-center gap-1.5 mt-3">
        <SignalPill>{swap.inScore.nailedOn.label}</SignalPill>
        <SignalPill>{swap.inScore.depth.label}</SignalPill>
        {swap.inScore.careerTrend.label !== "Insufficient history" && (
          <SignalPill>{swap.inScore.careerTrend.label}</SignalPill>
        )}
        <SignalPill>
          {teamsById.get(swap.in.team)?.short_name ?? "?"} · £{price(swap.in).toFixed(1)}m
        </SignalPill>
      </div>
      {swap.backups.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/50 text-center">
          <span className="text-[11px] font-medium text-[#6c6482]">
            Backup option{swap.backups.length > 1 ? "s" : ""}:{" "}
            {swap.backups.map((b) => `${b.web_name} (£${price(b).toFixed(1)}m)`).join(", ")}
          </span>
        </div>
      )}
    </div>
  );
}

function LineupCard({ pair }: { pair: LineupPair }) {
  return (
    <div className={`rounded-[1.5rem] p-5 ${GLASS_CARD}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6c6482] text-center mb-2">
        Lineup
      </div>
      <div className="flex items-center justify-center gap-4">
        {pair.bench && <MiniAvatar teamId={pair.bench.team} name={pair.bench.web_name} />}
        <div className="flex flex-col items-center text-[var(--accent-to)]">
          <span className="text-lg">→</span>
        </div>
        <MiniAvatar teamId={pair.start.team} name={pair.start.web_name} />
      </div>
      <p className="text-sm text-[#251f38]/85 mt-4 leading-relaxed text-center">
        Start <strong>{pair.start.web_name}</strong>
        {pair.bench ? (
          <>
            {" "}
            instead of <strong>{pair.bench.web_name}</strong>
          </>
        ) : (
          " — clear upgrade on your bench"
        )}
        .
      </p>
    </div>
  );
}

export default function TransformationPage() {
  const {
    resolved,
    loading,
    currentEvent,
    bootstrap,
    fixtures,
    teamsById,
    needsOnboarding,
  } = useMySquad();

  const [posFilter, setPosFilter] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_SWAPS);
  const chipState = useMemo(
    () =>
      currentEvent
        ? loadChipState(currentEvent)
        : { usingKey: null, usingEvent: null, history: {} },
    [currentEvent],
  );
  const activeChip = useMemo(() => {
    const apiName = chipState.usingKey?.split("-")[0];
    return apiName ? (CHIP_DISPLAY_NAME[apiName] ?? null) : null;
  }, [chipState]);

  const squadPlayers = useMemo(
    () => resolved?.players.map((p) => p.player) ?? [],
    [resolved],
  );
  const squadIds = useMemo(() => new Set(squadPlayers.map((p) => p.id)), [squadPlayers]);

  const shortlist = useMemo(() => {
    if (!bootstrap || !fixtures || !currentEvent || squadPlayers.length === 0) return null;
    return buildShortlist(squadPlayers, bootstrap, fixtures, currentEvent);
  }, [bootstrap, fixtures, currentEvent, squadPlayers]);

  const { data: summaries, loading: summariesLoading } = useElementSummaries(
    shortlist?.fetchIds ?? [],
  );

  const plan = useMemo(() => {
    if (!shortlist || !bootstrap || !fixtures || !currentEvent || !resolved || summariesLoading) {
      return null;
    }
    return buildTransformationPlan(
      shortlist,
      squadPlayers,
      resolved,
      bootstrap,
      fixtures,
      currentEvent,
      summaries,
      teamsById,
      activeChip,
    );
  }, [shortlist, bootstrap, fixtures, currentEvent, resolved, summaries, summariesLoading, squadPlayers, teamsById, activeChip]);

  const feed = useMemo(() => {
    if (!plan) return [];
    type FeedItem =
      | { kind: "transfer"; key: string; data: SwapSuggestion }
      | { kind: "lineup"; key: string; data: LineupPair };
    const items: FeedItem[] = [
      ...plan.swaps.map((s): FeedItem => ({
        kind: "transfer",
        key: `t-${s.out.id}-${s.in.id}`,
        data: s,
      })),
      ...plan.lineupDiff.pairs.map((p): FeedItem => ({
        kind: "lineup",
        key: `l-${p.start.id}`,
        data: p,
      })),
    ];
    const prioritizeBench = plan.chipContext.prioritizeBench;
    const rank = (item: FeedItem) => {
      if (prioritizeBench) {
        // Bench Boost active: every lineup/bench decision matters this week.
        return item.kind === "lineup" ? 0 : 1;
      }
      if (item.kind === "transfer" && item.data.priority === "recommended") return 0;
      if (item.kind === "lineup") return 1;
      return 2;
    };
    return items.sort((a, b) => rank(a) - rank(b));
  }, [plan]);

  const buyCandidates =
    bootstrap && fixtures && currentEvent
      ? rankBuyCandidates(bootstrap.elements, fixtures, currentEvent, {
          position: posFilter ?? undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
          excludeIds: squadIds,
        })
      : [];

  // Real, data-backed tips for chips not yet used — no scraped news, just what we can compute.
  const chipTips = useMemo(() => {
    if (!bootstrap || !plan || !shortlist) return [];
    const tips: { chip: string; tip: string }[] = [];
    const available = bootstrap.chips.filter(
      (c) =>
        currentEvent !== null &&
        currentEvent >= c.start_event &&
        currentEvent <= c.stop_event &&
        chipInstanceKey(c.name, c.start_event) !== chipState.usingKey &&
        chipState.history[chipInstanceKey(c.name, c.start_event)] === undefined,
    );
    for (const c of available) {
      const label = CHIP_DISPLAY_NAME[c.name] ?? c.name;
      if (label === "Wildcard") {
        tips.push({
          chip: label,
          tip:
            shortlist.dropCandidates.length > 0
              ? `${shortlist.dropCandidates.length} squad player${shortlist.dropCandidates.length === 1 ? "" : "s"} flagged right now — Wildcard resets your squad without using a transfer.`
              : "Your squad has no flagged issues right now — save it for a bigger reset.",
        });
      } else if (label === "Bench Boost") {
        const benchIds = new Set(
          resolved?.players.filter((p) => !p.isStarting).map((p) => p.player.id) ?? [],
        );
        const bench = squadPlayers.filter((p) => benchIds.has(p.id));
        const xi = squadPlayers.filter((p) => !benchIds.has(p.id));
        const avg = (players: typeof squadPlayers) =>
          players.length ? players.reduce((s, p) => s + form(p) + xgi(p), 0) / players.length : 0;
        const benchAvg = avg(bench);
        const xiAvg = avg(xi);
        const ratio = xiAvg > 0 ? Math.round((benchAvg / xiAvg) * 100) : 0;
        tips.push({
          chip: label,
          tip: `Your bench currently rates at about ${ratio}% of your starting XI's output — ${
            ratio >= 60 ? "a strong week to consider it" : "worth strengthening the bench before you play it"
          }.`,
        });
      } else if (label === "Triple Captain") {
        const top = plan.captainBreakdown[0];
        tips.push({
          chip: label,
          tip: top
            ? `${top.player.web_name} is your best captain pick right now (${top.nextFixture}) — Triple Captain amplifies that.`
            : "No standout captain pick yet to build a Triple Captain week around.",
        });
      } else {
        tips.push({
          chip: label,
          tip: "Available to use — check the Chips page for fixture-based timing.",
        });
      }
    }
    return tips;
  }, [bootstrap, plan, shortlist, currentEvent, chipState, resolved, squadPlayers]);

  if (loading) return <p className="text-[#6c6482]">Loading…</p>;

  if (needsOnboarding || !resolved) {
    return (
      <div className={`max-w-lg mx-auto text-center py-12 px-8 space-y-4 rounded-[2rem] ${GLASS_CARD}`}>
        <p className="text-[#6c6482] text-sm">
          Set up your squad first to get personalised suggestions.
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

  return (
    <div className="space-y-8">
      <div className={`rounded-2xl px-5 py-4 ${GLASS_PILL}`}>
        <h1 className="text-xl font-semibold text-[#251f38]">Transformation</h1>
        <p className="text-sm text-[#6c6482] mt-0.5">
          Your advisor for this squad: who to swap, who to captain, who to start —
          backed by form, xGI, fixture difficulty, rotation risk, shirt competition,
          and career trend. Real signals only.
        </p>
      </div>

      {plan && plan.chipContext.active && plan.chipContext.note && (
        <div
          className="rounded-2xl px-5 py-4 text-sm text-white font-medium shadow-[0_16px_36px_-16px_rgba(var(--accent-rgb),0.6)]"
          style={{ background: "linear-gradient(120deg, var(--accent-from), var(--accent-to))" }}
        >
          <span className="uppercase tracking-wider text-[11px] font-bold block mb-1 opacity-90">
            {plan.chipContext.active} active this gameweek
          </span>
          {plan.chipContext.note}
        </div>
      )}

      {plan && (
        <div className={`rounded-[1.75rem] p-6 flex items-center gap-6 ${GLASS_CARD_STRONG}`}>
          <div className="text-center shrink-0">
            <div
              className="text-4xl font-bold"
              style={{ color: "var(--accent-to)" }}
            >
              {plan.teamRating.rating}%
            </div>
            <div className="text-xs text-[#6c6482] font-medium mt-1">Team Rating</div>
          </div>
          <div className="border-l border-white/60 pl-6 flex-1">
            <p className="text-[#251f38] font-semibold">{plan.teamRating.label}</p>
            <p className="text-sm text-[#6c6482] mt-1">
              Your squad&apos;s average percentile against every realistic option in the
              same positions league-wide.
              {plan.teamRating.weakestLink &&
                ` Weakest link right now: ${plan.teamRating.weakestLink.web_name}.`}
            </p>
          </div>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold text-[#251f38] px-1">Swap suggestions</h2>
        {summariesLoading && (
          <p className="text-sm text-[#6c6482] px-1">Analysing your squad…</p>
        )}
        {!summariesLoading && plan && feed.length === 0 && (
          <div className={`rounded-2xl px-6 py-8 text-center ${GLASS_CARD}`}>
            <p className="text-[#251f38] font-medium">Your squad is set</p>
            <p className="text-sm text-[#6c6482] mt-1">
              Nothing — transfer or lineup — clears the bar for a change right now.
            </p>
          </div>
        )}
        {!summariesLoading && plan && feed.length > 0 && (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              {feed.slice(0, visibleCount).map((item) =>
                item.kind === "transfer" ? (
                  <TransferCard key={item.key} swap={item.data} teamsById={teamsById} />
                ) : (
                  <LineupCard key={item.key} pair={item.data} />
                ),
              )}
            </div>
            {visibleCount < feed.length && (
              <div className="text-center">
                <button
                  onClick={() => setVisibleCount((c) => Math.min(feed.length, c + VISIBLE_STEP))}
                  className="text-sm font-medium text-white bg-[#251f38] hover:brightness-110 active:scale-[0.98] transition-all px-5 py-2 rounded-full"
                >
                  Show {Math.min(VISIBLE_STEP, feed.length - visibleCount)} more suggestions
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {plan && (
        <section className="space-y-3">
          <h2 className="font-semibold text-[#251f38] px-1">Captain &amp; Vice-Captain</h2>
          <div
            className={`rounded-2xl p-5 ${GLASS_CARD} ${
              plan.captainDiff.captainMatches ? "border-l-4 border-l-[#22c08f]" : "border-l-4 border-l-[#f5a623]"
            }`}
          >
            <p className="text-sm text-[#251f38]">{plan.captainDiff.message}</p>
          </div>
          <div className={`rounded-2xl overflow-hidden ${GLASS_CARD}`}>
            {plan.captainBreakdown.map((b, i) => (
              <div
                key={b.player.id}
                className={`flex items-center gap-3 px-4 py-3 ${
                  i > 0 ? "border-t border-white/50" : ""
                }`}
              >
                <span className="text-sm font-bold text-[#6c6482] w-5 text-center">{i + 1}</span>
                <span className="font-medium text-[#251f38] flex-1">{b.player.web_name}</span>
                <span className="text-xs text-[#6c6482]">{b.nextFixture}</span>
                <span className="text-xs font-medium text-[#6c6482] w-16 text-right">
                  form {form(b.player).toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {chipTips.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-[#251f38] px-1">Chips available</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {chipTips.map((t) => (
              <div key={t.chip} className={`rounded-2xl p-4 ${GLASS_CARD}`}>
                <p className="text-sm font-semibold text-[#251f38]">{t.chip}</p>
                <p className="text-sm text-[#6c6482] mt-1">{t.tip}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 px-1">
          <h2 className="font-semibold text-[#1f9e6f]">All buy candidates</h2>
          <div className="flex gap-2 items-center">
            {[null, POSITION.GKP, POSITION.DEF, POSITION.MID, POSITION.FWD].map(
              (pos) => (
                <button
                  key={pos ?? "all"}
                  onClick={() => setPosFilter(pos)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    posFilter === pos
                      ? "bg-[#251f38] text-white"
                      : "bg-white/60 text-[#6c6482] border border-white/70 hover:bg-white/90"
                  }`}
                >
                  {pos ? POSITION_LABEL[pos] : "All"}
                </button>
              ),
            )}
            <input
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Max £m"
              className="bg-white/60 border border-white/70 rounded-full px-3 py-1.5 text-xs w-20 placeholder:text-[#6c6482]/70 focus:outline-none focus:ring-2 focus:ring-[var(--accent-from)]"
            />
          </div>
        </div>
        <div className={`overflow-x-auto rounded-2xl ${GLASS_CARD}`}>
          <table className="w-full text-sm">
            <thead className="text-[#6c6482] text-xs uppercase border-b border-white/60">
              <tr>
                <th className="text-left px-4 py-3">Player</th>
                <th className="text-right px-4 py-3">Price</th>
                <th className="text-right px-4 py-3">Form</th>
                <th className="text-right px-4 py-3">G+A</th>
                <th className="text-right px-4 py-3">xGI</th>
                <th className="text-right px-4 py-3">Avg FDR (5)</th>
                <th className="text-left px-4 py-3">Why</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/50">
              {buyCandidates.map(({ player: p, avgFdr, reasons }) => (
                <tr key={p.id} className="hover:bg-white/40 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-[#251f38]">{p.web_name}</span>{" "}
                    <span className="text-[#6c6482] text-xs">
                      {teamsById.get(p.team)?.short_name} · {POSITION_LABEL[p.element_type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-[#251f38]">£{price(p).toFixed(1)}m</td>
                  <td className="px-4 py-3 text-right text-[#251f38]">{form(p).toFixed(1)}</td>
                  <td className="px-4 py-3 text-right text-[#251f38]">{goalsPlusAssists(p)}</td>
                  <td className="px-4 py-3 text-right text-[#251f38]">{xgi(p).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-[#251f38]">
                    {avgFdr !== null ? avgFdr.toFixed(1) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {reasons.map((r) => (
                        <SignalPill key={r}>{r}</SignalPill>
                      ))}
                      {reasons.length === 0 && <span className="text-[#6c6482]">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
