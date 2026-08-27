import type { LocationSuggestion } from "../../../types/planner";

export const dynamic = "force-dynamic";

function decodeCity(value: string | null) {
  if (!value) return null;

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function GET(request: Request) {
  const city = decodeCity(request.headers.get("x-vercel-ip-city"));
  const country = request.headers.get("x-vercel-ip-country") ?? undefined;
  const latitude = Number(request.headers.get("x-vercel-ip-latitude"));
  const longitude = Number(request.headers.get("x-vercel-ip-longitude"));

  const hasValidLocation =
    city &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;

  const location: LocationSuggestion | null = hasValidLocation
    ? {
        id: -3,
        name: city,
        country,
        latitude,
        longitude,
      }
    : null;

  return Response.json(
    { location },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
