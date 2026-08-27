import type { LocationSuggestion } from "../types/planner";

type IpLocationResponse = {
  location: LocationSuggestion | null;
};

export async function requestIpLocation(signal?: AbortSignal) {
  const response = await fetch("/api/ip-location", {
    cache: "no-store",
    signal,
  });

  if (!response.ok) return null;
  const data = (await response.json()) as IpLocationResponse;
  return data.location;
}
