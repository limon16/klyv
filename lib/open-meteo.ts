import type { ForecastData, LocationSuggestion } from "../types/planner";

const CURRENT_FIELDS = [
  "temperature_2m",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "pressure_msl",
  "cloud_cover",
  "precipitation",
  "is_day",
].join(",");

const HOURLY_FIELDS = [
  "temperature_2m",
  "pressure_msl",
  "cloud_cover",
  "precipitation",
  "wind_speed_10m",
  "wind_gusts_10m",
  "wind_direction_10m",
  "is_day",
].join(",");

export async function requestForecast(
  latitude: number,
  longitude: number,
): Promise<ForecastData> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("current", CURRENT_FIELDS);
  url.searchParams.set("hourly", HOURLY_FIELDS);
  url.searchParams.set("past_days", "1");
  url.searchParams.set("forecast_days", "3");
  url.searchParams.set("timezone", "auto");

  const response = await fetch(url);
  if (!response.ok) throw new Error("weather");
  return response.json();
}

export async function searchLocations(
  query: string,
  signal?: AbortSignal,
  countryCode?: string,
): Promise<LocationSuggestion[]> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", "6");
  url.searchParams.set("language", "uk");
  url.searchParams.set("format", "json");
  if (countryCode) {
    url.searchParams.set("countryCode", countryCode.toUpperCase());
  }

  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("geocoding");

  const data = (await response.json()) as { results?: LocationSuggestion[] };
  return data.results ?? [];
}
