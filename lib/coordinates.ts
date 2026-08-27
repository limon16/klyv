export type Coordinates = {
  latitude: number;
  longitude: number;
};

export function parseCoordinates(value: string): Coordinates | null {
  const normalized = value.replace(/,/g, " ").replace(/[°′'’]/g, " ");
  const numbers = normalized.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];

  if (numbers.length < 2) return null;

  let [latitude, longitude] = numbers;

  if (/\bS\b|пд\.?\s*ш/i.test(value)) latitude = -Math.abs(latitude);
  if (/\bW\b|зх\.?\s*д/i.test(value)) longitude = -Math.abs(longitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}
