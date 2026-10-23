"use client";

import { colorForTeam } from "@/lib/clubColors";
import type { Player } from "@/lib/types";

export function PlayerCard({
  player,
  opponentLabel,
  isCaptain,
  isViceCaptain,
  variant = "pitch",
}: {
  player: Player;
  opponentLabel?: string;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  variant?: "pitch" | "bench";
}) {
  const initials = player.web_name.slice(0, 2).toUpperCase();
  const teamColor = colorForTeam(player.team);
  const flagged =
    player.status !== "a" ||
    (player.chance_of_playing_next_round ?? 100) < 75;

  return (
    <div className="flex flex-col items-center w-20 sm:w-24">
      <div className="relative">
        <div
          className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm ring-2 ring-white/60"
          style={{
            backgroundColor: teamColor,
            backgroundImage:
              "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.85), rgba(255,255,255,0) 45%), radial-gradient(circle at 72% 82%, rgba(0,0,0,0.28), rgba(0,0,0,0) 60%)",
            boxShadow: `0 12px 22px -8px ${teamColor}99, 0 2px 6px -2px rgba(37,31,56,0.3)`,
          }}
        >
          {initials}
        </div>
        {isCaptain && (
          <span
            className="absolute -top-1.5 -right-1.5 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white"
            style={{
              background: "linear-gradient(145deg, #ffcf6b, #f5a623)",
              boxShadow: "0 4px 10px -2px rgba(245,166,35,0.7)",
            }}
          >
            C
          </span>
        )}
        {isViceCaptain && !isCaptain && (
          <span
            className="absolute -top-1.5 -right-1.5 text-[#251f38] text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white bg-white shadow-[0_4px_10px_-2px_rgba(37,31,56,0.35)]"
          >
            V
          </span>
        )}
        {flagged && (
          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white bg-gradient-to-br from-[var(--accent-light)] to-[var(--accent-to)] shadow-[0_3px_8px_-2px_rgba(var(--accent-rgb),0.7)]">
            <span className="w-1 h-1 rounded-full bg-white" />
          </span>
        )}
      </div>
      <div className="mt-1.5 bg-white/85 backdrop-blur-sm text-[#251f38] text-[11px] sm:text-xs font-semibold rounded-full px-2 py-0.5 w-full text-center truncate shadow-[0_4px_12px_-4px_rgba(37,31,56,0.25)] border border-white/70">
        {player.web_name}
      </div>
      {opponentLabel && (
        <div
          className={`text-[10px] mt-1 font-medium tracking-wide ${
            variant === "pitch" ? "text-white/85" : "text-[#6c6482]"
          }`}
        >
          {opponentLabel}
        </div>
      )}
    </div>
  );
}
