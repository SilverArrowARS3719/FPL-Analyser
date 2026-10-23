"use client";

import { useMemo, useState } from "react";
import { FPL_ENTRY_ID } from "./constants";
import { resolveCurrentEventId } from "./gameweek";
import { loadSquad, type Squad } from "./squadStore";
import type { Player, Team, ElementType } from "./types";
import { useBootstrap, useEntryPicks, useFixtures } from "./useFplData";

export interface ResolvedSquadPlayer {
  player: Player;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isStarting: boolean;
}

export interface ResolvedSquad {
  source: "live" | "manual";
  currentEvent: number;
  bank: number | null;
  players: ResolvedSquadPlayer[];
}

export function useMySquad() {
  const { data: bootstrap, loading: bootLoading, error: bootError } = useBootstrap();
  const { data: fixtures, loading: fixturesLoading } = useFixtures();
  const currentEvent = bootstrap ? resolveCurrentEventId(bootstrap) : null;
  const {
    data: picks,
    loading: picksLoading,
    error: picksError,
  } = useEntryPicks(FPL_ENTRY_ID, currentEvent);

  const [manual] = useState<Squad | null | undefined>(() =>
    typeof window !== "undefined" ? loadSquad() : undefined,
  );

  const elementsById = useMemo(() => {
    const map = new Map<number, Player>();
    bootstrap?.elements.forEach((e) => map.set(e.id, e));
    return map;
  }, [bootstrap]);

  const teamsById = useMemo(() => {
    const map = new Map<number, Team>();
    bootstrap?.teams.forEach((t) => map.set(t.id, t));
    return map;
  }, [bootstrap]);

  const elementTypesById = useMemo(() => {
    const map = new Map<number, ElementType>();
    bootstrap?.element_types.forEach((t) => map.set(t.id, t));
    return map;
  }, [bootstrap]);

  const loading =
    bootLoading || fixturesLoading || picksLoading || manual === undefined;

  let resolved: ResolvedSquad | null = null;
  if (bootstrap && currentEvent && manual !== undefined) {
    if (picks && !picksError) {
      resolved = {
        source: "live",
        currentEvent,
        bank: picks.entry_history.bank / 10,
        players: picks.picks
          .map((pk) => ({
            player: elementsById.get(pk.element),
            isCaptain: pk.is_captain,
            isViceCaptain: pk.is_vice_captain,
            isStarting: pk.position <= 11,
          }))
          .filter((rp): rp is ResolvedSquadPlayer => !!rp.player),
      };
    } else if (manual && manual.picks.length > 0) {
      resolved = {
        source: "manual",
        currentEvent,
        bank: manual.bank,
        players: manual.picks
          .map((pk) => ({
            player: elementsById.get(pk.elementId),
            isCaptain: pk.isCaptain,
            isViceCaptain: pk.isViceCaptain,
            isStarting: pk.isStarting,
          }))
          .filter((rp): rp is ResolvedSquadPlayer => !!rp.player),
      };
    }
  }

  const needsOnboarding = !loading && bootstrap && !resolved;

  return {
    resolved,
    loading,
    error: bootError,
    currentEvent,
    bootstrap,
    fixtures,
    teamsById,
    elementTypesById,
    needsOnboarding,
  };
}
