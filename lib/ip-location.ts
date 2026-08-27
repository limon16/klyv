import type { LocationSuggestion } from "../types/planner";
import { searchLocations } from "./open-meteo";

type IpLocationResponse = {
  location: LocationSuggestion | null;
};

function distanceKm(
  origin: LocationSuggestion,
  candidate: LocationSuggestion,
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(candidate.latitude - origin.latitude);
  const longitudeDelta = toRadians(candidate.longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const candidateLatitude = toRadians(candidate.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(candidateLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

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
        return distanceKm(data.location!, candidate) <
          distanceKm(data.location!, best)
          ? candidate
          : best;
      },
      null,
    );

    if (nearest && distanceKm(data.location, nearest) <= 100) {
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
