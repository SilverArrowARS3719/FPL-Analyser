"use client";

import { useEffect, useState } from "react";
import type {
  Bootstrap,
  ElementSummaryResponse,
  EntryPicksResponse,
  EntrySummary,
  EventLive,
  Fixture,
} from "./types";

interface FetchState<T> {
  url: string | null;
  data: T | null;
  error: string | null;
}

interface JsonResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useJson<T>(url: string | null): JsonResult<T> {
  const [state, setState] = useState<FetchState<T>>({
    url: null,
    data: null,
    error: null,
  });

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const err = new Error(body.error ?? `Request failed (${res.status})`);
          (err as Error & { status?: number }).status = res.status;
          throw err;
        }
        return res.json() as Promise<T>;
      })
      .then((data) => {
        if (!cancelled) setState({ url, data, error: null });
      })
      .catch((err: Error & { status?: number }) => {
        if (!cancelled) {
          setState({
            url,
            data: null,
            error: err.status === 404 ? "not_found" : err.message,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!url) {
    return { data: null, loading: false, error: null };
  }
  const loading = state.url !== url;
  return {
    data: loading ? null : state.data,
    loading,
    error: loading ? null : state.error,
  };
}

export function useBootstrap() {
  return useJson<Bootstrap>("/api/bootstrap");
}

export function useFixtures() {
  return useJson<Fixture[]>("/api/fixtures");
}

export function useEntry(id: number) {
  return useJson<EntrySummary>(`/api/entry/${id}`);
}

export function useEntryPicks(id: number, gw: number | null) {
  return useJson<EntryPicksResponse>(gw ? `/api/entry/${id}/picks/${gw}` : null);
}

export function useEventLive(gw: number | null) {
  return useJson<EventLive>(gw ? `/api/live/${gw}` : null);
}

const SUMMARY_CHUNK_SIZE = 10;

function idsKey(ids: number[]): string {
  return [...new Set(ids)].sort((a, b) => a - b).join(",");
}

interface SummariesState {
  key: string;
  data: Map<number, ElementSummaryResponse>;
}

/** Fetches element-summary for a bounded list of ids in small concurrent chunks, never all at once. */
export function useElementSummaries(ids: number[]) {
  const key = idsKey(ids);
  const [state, setState] = useState<SummariesState>({ key: "", data: new Map() });

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const uniqueIds = key.split(",").map(Number);

    async function run() {
      const result = new Map<number, ElementSummaryResponse>();
      for (let i = 0; i < uniqueIds.length; i += SUMMARY_CHUNK_SIZE) {
        const chunk = uniqueIds.slice(i, i + SUMMARY_CHUNK_SIZE);
        const settled = await Promise.all(
          chunk.map(async (id) => {
            try {
              const res = await fetch(`/api/element-summary/${id}`);
              if (!res.ok) return null;
              return { id, data: (await res.json()) as ElementSummaryResponse };
            } catch {
              return null;
            }
          }),
        );
        if (cancelled) return;
        for (const item of settled) {
          if (item) result.set(item.id, item.data);
        }
      }
      if (!cancelled) setState({ key, data: result });
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (!key) {
    return { data: new Map<number, ElementSummaryResponse>(), loading: false };
  }
  const loading = state.key !== key;
  return {
    data: loading ? new Map<number, ElementSummaryResponse>() : state.data,
    loading,
  };
}
