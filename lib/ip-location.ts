import type { LocationSuggestion } from "../types/planner";
import { searchLocations } from "./open-meteo";

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
  if (!data.location) return null;

  const countryCode = data.location.country;

  try {
    const localizedLocations = await searchLocations(
      data.location.name,
      signal,
      countryCode,
    );
    const nearest = localizedLocations.reduce<LocationSuggestion | null>(
      (best, candidate) => {
        if (!best) return candidate;

        const candidateDistance =
          (candidate.latitude - data.location!.latitude) ** 2 +
          (candidate.longitude - data.location!.longitude) ** 2;
        const bestDistance =
          (best.latitude - data.location!.latitude) ** 2 +
          (best.longitude - data.location!.longitude) ** 2;

        return candidateDistance < bestDistance ? candidate : best;
      },
      null,
    );

    if (nearest) {
      return {
        ...data.location,
        name: nearest.name,
        admin1: nearest.admin1,
        country: nearest.country,
      };
    }
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
  }

  return data.location;
}
