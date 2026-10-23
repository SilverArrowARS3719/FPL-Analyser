"use client";

import { POSITION } from "@/lib/types";
import type { ResolvedSquadPlayer } from "@/lib/useMySquad";
import { PlayerCard } from "./PlayerCard";

const PITCH_LINES =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 620'><rect x='3' y='3' width='394' height='614' fill='none' stroke='white' stroke-width='2' opacity='0.16'/><line x1='3' y1='310' x2='397' y2='310' stroke='white' stroke-width='2' opacity='0.16'/><circle cx='200' cy='310' r='58' fill='none' stroke='white' stroke-width='2' opacity='0.16'/><rect x='118' y='3' width='164' height='58' fill='none' stroke='white' stroke-width='2' opacity='0.16'/><rect x='118' y='559' width='164' height='58' fill='none' stroke='white' stroke-width='2' opacity='0.16'/></svg>\")";

export function Pitch({
  players,
  opponentLabel,
}: {
  players: ResolvedSquadPlayer[];
  opponentLabel: (teamId: number) => string;
}) {
  const starting = players.filter((p) => p.isStarting);
  const bench = players.filter((p) => !p.isStarting);
  const byPos = (pos: number) =>
    starting.filter((p) => p.player.element_type === pos);

  const rows = [
    byPos(POSITION.GKP),
    byPos(POSITION.DEF),
    byPos(POSITION.MID),
    byPos(POSITION.FWD),
  ];

  return (
    <div className="rounded-[2rem] overflow-hidden border border-white/60 shadow-[0_30px_70px_-30px_rgba(34,192,143,0.5)]">
      <div
        className="px-3 py-7 sm:py-10 relative"
        style={{
          backgroundImage: `${PITCH_LINES}, radial-gradient(ellipse 700px 500px at 50% -10%, #4fdba0 0%, transparent 60%), linear-gradient(160deg, #1f9e6f 0%, #167a56 60%, #0f5f43 100%)`,
          backgroundSize: "100% 100%, 100% 100%, 100% 100%",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="flex flex-col gap-6 sm:gap-9 relative">
          {rows.map((row, i) => (
            <div key={i} className="flex justify-center gap-3 sm:gap-6 flex-wrap">
              {row.map((rp) => (
                <PlayerCard
                  key={rp.player.id}
                  player={rp.player}
                  opponentLabel={opponentLabel(rp.player.team)}
                  isCaptain={rp.isCaptain}
                  isViceCaptain={rp.isViceCaptain}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white/70 backdrop-blur-xl px-4 py-5 border-t border-white/70">
        <div className="text-[#6c6482] text-xs font-semibold uppercase tracking-wider mb-3">
          Bench
        </div>
        <div className="flex gap-3 sm:gap-6 flex-wrap">
          {bench.map((rp) => (
            <PlayerCard
              key={rp.player.id}
              player={rp.player}
              opponentLabel={opponentLabel(rp.player.team)}
              isCaptain={rp.isCaptain}
              isViceCaptain={rp.isViceCaptain}
              variant="bench"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
