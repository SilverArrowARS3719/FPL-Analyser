import type {
  Bootstrap,
  ElementSummaryResponse,
  EntryPicksResponse,
  EntrySummary,
  EventLive,
  Fixture,
} from "./types";

const FPL_BASE = "https://fantasy.premierleague.com/api";

/** FPL's edge blocks requests with no browser-like UA; keep this on every call. */
const FPL_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "application/json",
};

async function fplFetch<T>(path: string, revalidateSeconds: number): Promise<T> {
  const res = await fetch(`${FPL_BASE}${path}`, {
    headers: FPL_HEADERS,
    next: { revalidate: revalidateSeconds },
  });
  if (!res.ok) {
    throw new Error(`FPL API ${path} responded ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function getBootstrap(): Promise<Bootstrap> {
  return fplFetch<Bootstrap>("/bootstrap-static/", 60);
}

export function getFixtures(eventId?: number): Promise<Fixture[]> {
  const qs = eventId ? `?event=${eventId}` : "";
  return fplFetch<Fixture[]>(`/fixtures/${qs}`, 60);
}

export function getEntry(entryId: number): Promise<EntrySummary> {
  return fplFetch<EntrySummary>(`/entry/${entryId}/`, 60);
}

export function getEntryPicks(
  entryId: number,
  gw: number,
): Promise<EntryPicksResponse> {
  return fplFetch<EntryPicksResponse>(
    `/entry/${entryId}/event/${gw}/picks/`,
    30,
  );
}

export function getEventLive(gw: number): Promise<EventLive> {
  return fplFetch<EventLive>(`/event/${gw}/live/`, 30);
}

export function getElementSummary(elementId: number): Promise<ElementSummaryResponse> {
  return fplFetch<ElementSummaryResponse>(`/element-summary/${elementId}/`, 1800);
}

export { resolveCurrentEventId } from "./gameweek";
