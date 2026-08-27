import { SPECIES } from "./fish-model";
import type { PersistedInput } from "../types/planner";

export const STORAGE_KEY = "klov:last-input:v1";

const LOCATION_SOURCES = ["city", "gps", "coordinates"];
const WATER_TYPES = ["unknown", "river", "lake", "reservoir", "pond"];
const CLARITIES = ["unknown", "clear", "stained", "murky"];
const FLOWS = ["unknown", "still", "slow", "moderate", "fast"];

export function isPersistedInput(value: unknown): value is PersistedInput {
  if (!value || typeof value !== "object") return false;

  const data = value as Partial<PersistedInput>;
  if (
    data.version !== 1 ||
    typeof data.savedAt !== "string" ||
    !SPECIES.some((item) => item.id === data.species) ||
    !data.water
  ) {
    return false;
  }

  if (data.location) {
    if (!LOCATION_SOURCES.includes(data.location.source)) return false;
    if (
      typeof data.location.id !== "number" ||
      typeof data.location.name !== "string"
    ) {
      return false;
    }
    if (
      !Number.isFinite(data.location.latitude) ||
      !Number.isFinite(data.location.longitude) ||
      Math.abs(data.location.latitude) > 90 ||
      Math.abs(data.location.longitude) > 180
    ) {
      return false;
    }
  }

  return (
    typeof data.water.waterTemperature === "string" &&
    typeof data.water.hasStructure === "boolean" &&
    WATER_TYPES.includes(data.water.waterType) &&
    CLARITIES.includes(data.water.clarity) &&
    FLOWS.includes(data.water.flow)
  );
}

export function readPlannerState(): PersistedInput | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const value: unknown = JSON.parse(raw);
    if (isPersistedInput(value)) return value;

    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}

export function writePlannerState(value: PersistedInput) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Private browsing or disabled storage.
  }
}

export function clearPlannerState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage may be unavailable.
  }
}
