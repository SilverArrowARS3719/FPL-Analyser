"use client";

import { SQUAD_STORAGE_KEY } from "./constants";

export interface SquadPick {
  elementId: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isStarting: boolean;
  benchOrder?: number;
}

export interface Squad {
  bank: number;
  picks: SquadPick[];
}

export function loadSquad(): Squad | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SQUAD_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Squad;
  } catch {
    return null;
  }
}

export function saveSquad(squad: Squad): void {
  window.localStorage.setItem(SQUAD_STORAGE_KEY, JSON.stringify(squad));
}

export function clearSquad(): void {
  window.localStorage.removeItem(SQUAD_STORAGE_KEY);
}
