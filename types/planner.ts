import type {
  Clarity,
  Flow,
  ScoreResult,
  SpeciesId,
  WaterType,
} from "../lib/fish-model";

export type LocationSource = "city" | "gps" | "coordinates";
export type LocationMode = "city" | "coordinates";
export type ResultTab = "forecast" | "conditions" | "advice";

export type LocationSuggestion = {
  id: number;
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
};

export type CurrentWeather = {
  time: string;
  temperature_2m: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  wind_gusts_10m: number;
  pressure_msl: number;
  cloud_cover: number;
  precipitation: number;
  is_day: number;
};

export type HourlyWeather = {
  time: string[];
  temperature_2m: number[];
  pressure_msl: number[];
  cloud_cover: number[];
  precipitation: number[];
  wind_speed_10m: number[];
  wind_gusts_10m: number[];
  wind_direction_10m: number[];
  is_day: number[];
};

export type ForecastData = {
  current: CurrentWeather;
  hourly: HourlyWeather;
  timezone_abbreviation: string;
  utc_offset_seconds: number;
};

export type WaterSettings = {
  waterType: WaterType;
  clarity: Clarity;
  flow: Flow;
  waterTemperature: string;
  hasStructure: boolean;
};

export type PersistedInput = {
  version: 1;
  savedAt: string;
  species: SpeciesId;
  location: (LocationSuggestion & { source: LocationSource }) | null;
  water: WaterSettings;
};

export type DateChoice = {
  offset: number;
  date: string;
  title: string;
  detail: string;
};

export type ForecastHistory = {
  index: number;
  pressureTrend3h: number;
  temperatureTrend24h: number;
  precipitation24h: number;
};

export type BestWindow = {
  time: string;
  value: number;
  peak: number;
  hours: number;
};

export type ForecastViewModel = {
  dateChoices: DateChoice[];
  score: ScoreResult | null;
  selectedWeather: CurrentWeather | null;
  history: ForecastHistory | null;
  bestWindows: BestWindow[];
};
