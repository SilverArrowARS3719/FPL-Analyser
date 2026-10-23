"use client";

import Link from "next/link";
import { ChipTracker } from "@/components/ChipTracker";
import { Pitch } from "@/components/Pitch";
import { FPL_ENTRY_ID } from "@/lib/constants";
import { opponentLabelFor } from "@/lib/nextFixture";
import { GLASS_CARD, GLASS_PILL } from "@/lib/ui";
import { useMySquad } from "@/lib/useMySquad";

export default function TeamPage() {
  const {
    resolved,
    loading,
    currentEvent,
    bootstrap,
    fixtures,
    teamsById,
    needsOnboarding,
  } = useMySquad();

  if (loading) {
    return <p className="text-[#6c6482]">Loading your squad…</p>;
  }

  if (needsOnboarding || !resolved) {
    return (
      <div
        className={`max-w-lg mx-auto text-center py-12 px-8 space-y-4 rounded-[2rem] ${GLASS_CARD}`}
      >
        <h1 className="text-xl font-semibold text-[#251f38]">
          No squad set up yet
        </h1>
        <p className="text-[#6c6482] text-sm">
          It&apos;s pre-season, so your real FPL picks (entry {FPL_ENTRY_ID})
          aren&apos;t available from the API yet. Build your squad here once
          and it&apos;ll auto-switch to your live picks from Gameweek 1
          onward.
        </p>
        <Link
          href="/onboarding"
          className="inline-block bg-gradient-to-br from-[var(--accent-from)] to-[var(--accent-to)] hover:brightness-105 active:scale-[0.98] transition-all text-white font-medium px-5 py-2.5 rounded-full shadow-[0_12px_24px_-8px_rgba(var(--accent-rgb),0.6)]"
        >
          Build my squad
        </Link>
      </div>
    );
  }

  const label = (teamId: number) =>
    fixtures ? opponentLabelFor(teamId, fixtures, currentEvent ?? 1, teamsById) : "";

  return (
    <div className="space-y-5">
      <div
        className={`flex items-center justify-between flex-wrap gap-3 rounded-2xl px-5 py-3.5 ${GLASS_PILL}`}
      >
        <div>
          <h1 className="text-lg font-semibold text-[#251f38]">My Team</h1>
          <p className="text-sm text-[#6c6482]">
            Gameweek {currentEvent}
            {resolved.source === "manual" && " · manual squad (pre-season)"}
            {resolved.bank !== null && ` · Bank: £${resolved.bank.toFixed(1)}m`}
          </p>
        </div>
        {resolved.source === "manual" && (
          <Link
            href="/onboarding"
            className="text-sm font-medium text-white bg-[#251f38] hover:brightness-110 active:scale-[0.98] transition-all px-4 py-2 rounded-full"
          >
            Edit squad
          </Link>
        )}
      </div>
      {bootstrap && currentEvent && (
        <ChipTracker chips={bootstrap.chips} currentEvent={currentEvent} />
      )}
      <Pitch players={resolved.players} opponentLabel={label} />
    </div>
  );
}
