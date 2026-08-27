import { scoreSpecies, type SpeciesId } from "./fish-model";
import type {
  BestWindow,
  CurrentWeather,
  DateChoice,
  ForecastData,
  ForecastHistory,
  ForecastViewModel,
  WaterSettings,
} from "../types/planner";

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function nextHour(time: string) {
  const hour = (Number(time.slice(0, 2)) + 1) % 24;
  return `${String(hour).padStart(2, "0")}:00`;
}

export function getCurrentIndex(forecast: ForecastData) {
  const currentHour = `${forecast.current.time.slice(0, 13)}:00`;
  const exact = forecast.hourly.time.indexOf(currentHour);

  if (exact >= 0) return exact;
  return Math.max(
    0,
    forecast.hourly.time.findIndex((time) => time >= forecast.current.time),
  );
}

export function getHistory(
  forecast: ForecastData,
  index = getCurrentIndex(forecast),
): ForecastHistory {
  const past = (values: number[], hours: number) =>
    values[Math.max(0, index - hours)] ?? values[0] ?? 0;
  const precipitation24h = forecast.hourly.precipitation
    .slice(Math.max(0, index - 23), index + 1)
    .reduce((sum, value) => sum + (value || 0), 0);

  return {
    index,
    pressureTrend3h:
      (forecast.hourly.pressure_msl[index] ?? forecast.current.pressure_msl) -
      past(forecast.hourly.pressure_msl, 3),
    temperatureTrend24h:
      (forecast.hourly.temperature_2m[index] ??
        forecast.current.temperature_2m) -
      past(forecast.hourly.temperature_2m, 24),
    precipitation24h,
  };
}

export function getDateChoices(forecast: ForecastData | null): DateChoice[] {
  const fallback = Array.from({ length: 3 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return dateKey(date);
  });
  const dates = forecast
    ? [
        ...new Set(
          forecast.hourly.time
            .map((time) => time.slice(0, 10))
            .filter((date) => date >= forecast.current.time.slice(0, 10)),
        ),
      ].slice(0, 3)
    : fallback;

  return dates.map((date, offset) => ({
    offset,
    date,
    title: offset === 0 ? "Сьогодні" : offset === 1 ? "Завтра" : "Післязавтра",
    detail: new Intl.DateTimeFormat("uk-UA", {
      day: "numeric",
      month: "short",
    }).format(new Date(`${date}T12:00:00`)),
  }));
}

function selectedWeatherAt(
  forecast: ForecastData,
  index: number,
): CurrentWeather {
  return {
    time: forecast.hourly.time[index],
    temperature_2m: forecast.hourly.temperature_2m[index],
    wind_speed_10m: forecast.hourly.wind_speed_10m[index],
    wind_direction_10m: forecast.hourly.wind_direction_10m[index],
    wind_gusts_10m: forecast.hourly.wind_gusts_10m[index],
    pressure_msl: forecast.hourly.pressure_msl[index],
    cloud_cover: forecast.hourly.cloud_cover[index],
    precipitation: forecast.hourly.precipitation[index],
    is_day: forecast.hourly.is_day[index],
  };
}

function groupBestWindows(
  rows: { time: string; value: number }[],
): BestWindow[] {
  if (!rows.length) return [];

  const peak = Math.max(...rows.map((row) => row.value));
  const threshold = Math.max(55, peak - 8);
  const groups: (typeof rows)[] = [];

  rows.forEach((row, rowIndex) => {
    if (row.value < threshold) return;

    const current = groups.at(-1);
    const previous = current?.at(-1);
    const previousIndex = previous ? rows.indexOf(previous) : -2;

    if (current && rowIndex === previousIndex + 1) current.push(row);
    else groups.push([row]);
  });

  return groups
    .map((group) => ({
      time: `${group[0].time}–${nextHour(group.at(-1)!.time)}`,
      value: Math.round(
        group.reduce((sum, row) => sum + row.value, 0) / group.length,
      ),
      peak: Math.max(...group.map((row) => row.value)),
      hours: group.length,
    }))
    .sort((a, b) => b.peak - a.peak || b.hours - a.hours)
    .slice(0, 2)
    .sort((a, b) => a.time.localeCompare(b.time));
}

type BuildForecastViewModelInput = {
  forecast: ForecastData | null;
  dayOffset: number;
  species: SpeciesId;
  water: WaterSettings;
};

export function buildForecastViewModel({
  forecast,
  dayOffset,
  species,
  water,
}: BuildForecastViewModelInput): ForecastViewModel {
  const dateChoices = getDateChoices(forecast);
  if (!forecast) {
    return {
      dateChoices,
      score: null,
      selectedWeather: null,
      history: null,
      bestWindows: [],
    };
  }

  const selectedDate = dateChoices[dayOffset]?.date ?? dateChoices[0]?.date;
  const currentIndex = getCurrentIndex(forecast);
  const candidateIndices = forecast.hourly.time
    .map((time, index) => ({ time, index }))
    .filter(({ time, index }) => {
      if (!time.startsWith(selectedDate)) return false;
      const hour = Number(time.slice(11, 13));
      return dayOffset === 0
        ? index >= currentIndex && index < currentIndex + 12
        : hour >= 5 && hour <= 23;
    })
    .map(({ index }) => index);

  const scoredHours = candidateIndices.map((index) => {
    const time = forecast.hourly.time[index];
    const trends = getHistory(forecast, index);
    const result = scoreSpecies(species, {
      airTemperature: forecast.hourly.temperature_2m[index],
      waterTemperature:
        water.waterTemperature === ""
          ? undefined
          : Number(water.waterTemperature),
      windSpeed: forecast.hourly.wind_speed_10m[index],
      windGusts: forecast.hourly.wind_gusts_10m[index],
      cloudCover: forecast.hourly.cloud_cover[index],
      pressureTrend3h: trends.pressureTrend3h,
      temperatureTrend24h: trends.temperatureTrend24h,
      precipitation24h: trends.precipitation24h,
      isDay: forecast.hourly.is_day[index] === 1,
      hour: Number(time.slice(11, 13)),
      month: Number(time.slice(5, 7)),
      waterType: water.waterType,
      clarity: water.clarity,
      flow: water.flow,
      hasStructure: water.hasStructure,
    });

    return { index, time: time.slice(11, 16), result };
  });

  const bestHour = scoredHours.reduce<(typeof scoredHours)[number] | null>(
    (best, row) => (!best || row.result.score > best.result.score ? row : best),
    null,
  );

  return {
    dateChoices,
    score: bestHour?.result ?? null,
    selectedWeather: bestHour
      ? selectedWeatherAt(forecast, bestHour.index)
      : null,
    history: bestHour ? getHistory(forecast, bestHour.index) : null,
    bestWindows: groupBestWindows(
      scoredHours.map((row) => ({ time: row.time, value: row.result.score })),
    ),
  };
}
