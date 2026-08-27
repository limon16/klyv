"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Gauge, Info, MapPin, Pencil, Thermometer, Waves, Wind } from "lucide-react";
import { Clarity, Flow, scoreSpecies, SPECIES, SpeciesId, WaterType } from "./fish-model";

type Suggestion = { id: number; name: string; admin1?: string; country?: string; latitude: number; longitude: number };
type CurrentWeather = { time: string; temperature_2m: number; wind_speed_10m: number; wind_direction_10m: number; wind_gusts_10m: number; pressure_msl: number; cloud_cover: number; precipitation: number; is_day: number };
type Hourly = { time: string[]; temperature_2m: number[]; pressure_msl: number[]; cloud_cover: number[]; precipitation: number[]; wind_speed_10m: number[]; wind_gusts_10m: number[]; wind_direction_10m: number[]; is_day: number[] };
type ForecastData = { current: CurrentWeather; hourly: Hourly; timezone_abbreviation: string; utc_offset_seconds: number };
type LocationSource = "city" | "gps" | "coordinates";
type LocationMode = "city" | "coordinates";
type Tab = "forecast" | "conditions" | "advice";
type PersistedInput = { version: 1; savedAt: string; species: SpeciesId; location: { source: LocationSource; id: number; name: string; admin1?: string; country?: string; latitude: number; longitude: number } | null; water: { waterType: WaterType; clarity: Clarity; flow: Flow; waterTemperature: string; hasStructure: boolean } };

const STORAGE_KEY = "klov:last-input:v1";
const windNames = ["Пн", "Пн-Сх", "Сх", "Пд-Сх", "Пд", "Пд-Зх", "Зх", "Пн-Зх"];
const labelScore = (score: number) => score >= 76 ? "Дуже сприятливі" : score >= 61 ? "Сприятливі" : score >= 45 ? "Змішані" : "Складні";
const confidenceLabel = (value: number) => value >= 72 ? "вища" : value >= 55 ? "середня" : "базова";
const nextHour = (time: string) => `${String((Number(time.slice(0, 2)) + 1) % 24).padStart(2, "0")}:00`;
const driverIcons = { temperature: Thermometer, wind: Wind, pressure: Gauge, water: Waves };
const toneIcons = { good: Check, bad: AlertTriangle, neutral: Info };

function parseCoordinates(value: string) {
  const normalized = value.replace(/,/g, " ").replace(/[°′'’]/g, " ");
  const numbers = normalized.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (numbers.length < 2) return null;
  let [latitude, longitude] = numbers;
  if (/\bS\b|пд\.?\s*ш/i.test(value)) latitude = -Math.abs(latitude);
  if (/\bW\b|зх\.?\s*д/i.test(value)) longitude = -Math.abs(longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

function getCurrentIndex(forecast: ForecastData) {
  const currentHour = `${forecast.current.time.slice(0, 13)}:00`;
  const exact = forecast.hourly.time.indexOf(currentHour);
  return exact >= 0 ? exact : Math.max(0, forecast.hourly.time.findIndex((time) => time >= forecast.current.time));
}

function getHistory(forecast: ForecastData, index = getCurrentIndex(forecast)) {
  const past = (values: number[], hours: number) => values[Math.max(0, index - hours)] ?? values[0] ?? 0;
  const precipitation24h = forecast.hourly.precipitation.slice(Math.max(0, index - 23), index + 1).reduce((sum, value) => sum + (value || 0), 0);
  return {
    index,
    pressureTrend3h: (forecast.hourly.pressure_msl[index] ?? forecast.current.pressure_msl) - past(forecast.hourly.pressure_msl, 3),
    temperatureTrend24h: (forecast.hourly.temperature_2m[index] ?? forecast.current.temperature_2m) - past(forecast.hourly.temperature_2m, 24),
    precipitation24h,
  };
}

async function requestForecast(latitude: number, longitude: number): Promise<ForecastData> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude)); url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("current", "temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,cloud_cover,precipitation,is_day");
  url.searchParams.set("hourly", "temperature_2m,pressure_msl,cloud_cover,precipitation,wind_speed_10m,wind_gusts_10m,wind_direction_10m,is_day");
  url.searchParams.set("past_days", "1"); url.searchParams.set("forecast_days", "3"); url.searchParams.set("timezone", "auto");
  const response = await fetch(url);
  if (!response.ok) throw new Error("weather");
  return response.json();
}

function isPersistedInput(value: unknown): value is PersistedInput {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<PersistedInput>;
  if (data.version !== 1 || typeof data.savedAt !== "string" || !SPECIES.some((item) => item.id === data.species) || !data.water) return false;
  if (data.location) {
    if (!["city", "gps", "coordinates"].includes(data.location.source)) return false;
    if (typeof data.location.id !== "number" || typeof data.location.name !== "string") return false;
    if (!Number.isFinite(data.location.latitude) || !Number.isFinite(data.location.longitude) || Math.abs(data.location.latitude) > 90 || Math.abs(data.location.longitude) > 180) return false;
  }
  return typeof data.water.waterTemperature === "string" && typeof data.water.hasStructure === "boolean" && ["unknown", "river", "lake", "reservoir", "pond"].includes(data.water.waterType) && ["unknown", "clear", "stained", "murky"].includes(data.water.clarity) && ["unknown", "still", "slow", "moderate", "fast"].includes(data.water.flow);
}

export default function Home() {
  const [species, setSpecies] = useState<SpeciesId>("pike");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [selectedLocation, setSelectedLocation] = useState<Suggestion | null>(null);
  const [, setLocationSource] = useState<LocationSource>("city");
  const [, setGpsAccuracy] = useState<number | null>(null);
  const [activeLocation, setActiveLocation] = useState<Suggestion | null>(null);
  const [activeLocationSource, setActiveLocationSource] = useState<LocationSource>("city");
  const [activeGpsAccuracy, setActiveGpsAccuracy] = useState<number | null>(null);
  const [locationEditorOpen, setLocationEditorOpen] = useState(true);
  const [locationMode, setLocationMode] = useState<LocationMode>("city");
  const [coordinateText, setCoordinateText] = useState("");
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [dayOffset, setDayOffset] = useState(0);
  const [tab, setTab] = useState<Tab>("forecast");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [waterType, setWaterType] = useState<WaterType>("unknown");
  const [clarity, setClarity] = useState<Clarity>("unknown");
  const [flow, setFlow] = useState<Flow>("unknown");
  const [waterTemperature, setWaterTemperature] = useState("");
  const [hasStructure, setHasStructure] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [showAllSpecies, setShowAllSpecies] = useState(false);
  const [waterDetailsOpen, setWaterDetailsOpen] = useState(false);
  const searchRequest = useRef(0);
  const forecastRequest = useRef(0);
  const skipPersistence = useRef(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const locationButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const saved: unknown = raw ? JSON.parse(raw) : null;
        if (!isPersistedInput(saved)) {
          if (raw) window.localStorage.removeItem(STORAGE_KEY);
          if (!cancelled) setHydrated(true);
          return;
        }
        if (cancelled) return;
        setSpecies(saved.species); setSelectedLocation(saved.location); setActiveLocation(saved.location); setLocationSource(saved.location?.source ?? "city"); setActiveLocationSource(saved.location?.source ?? "city"); setLocationMode(saved.location?.source === "city" ? "city" : "coordinates");
        setQuery(saved.location?.source === "city" ? saved.location.name : "");
        setCoordinateText(saved.location?.source === "coordinates" ? `${saved.location.latitude.toFixed(4)}, ${saved.location.longitude.toFixed(4)}` : "");
        setWaterType(saved.water.waterType); setClarity(saved.water.clarity); setFlow(saved.water.flow); setWaterTemperature(saved.water.waterTemperature); setHasStructure(saved.water.hasStructure);
        setHydrated(true);
        if (saved.location) {
          setLocationEditorOpen(false);
          const requestId = ++forecastRequest.current;
          setStatus("Відновили останню точку. Оновлюємо погоду…");
          try {
            const fresh = await requestForecast(saved.location.latitude, saved.location.longitude);
            if (!cancelled && requestId === forecastRequest.current) { setForecast(fresh); setStatus("Останню точку відновлено. Погоду оновлено."); }
          } catch { if (!cancelled && requestId === forecastRequest.current) setStatus("Останню точку відновлено, але погоду поки не вдалося оновити."); }
        }
      } catch { if (!cancelled) setHydrated(true); }
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipPersistence.current) { skipPersistence.current = false; return; }
    const snapshot: PersistedInput = { version: 1, savedAt: new Date().toISOString(), species, location: activeLocation ? { ...activeLocation, source: activeLocationSource } : null, water: { waterType, clarity, flow, waterTemperature, hasStructure } };
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); } catch { /* Private browsing or disabled storage. */ }
  }, [hydrated, species, activeLocation, activeLocationSource, waterType, clarity, flow, waterTemperature, hasStructure]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || selectedLocation?.name === trimmed) {
      return;
    }
    const requestId = ++searchRequest.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
        url.searchParams.set("name", trimmed);
        url.searchParams.set("count", "6");
        url.searchParams.set("language", "uk");
        url.searchParams.set("format", "json");
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error("geocoding");
        const data = await response.json();
        if (requestId !== searchRequest.current) return;
        setSuggestions(data.results ?? []);
        setShowSuggestions(true);
        setHighlighted(-1);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setStatus("Пошук місць тимчасово недоступний. Спробуйте GPS або координати.");
      }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, selectedLocation]);

  const fallbackDateKeys = Array.from({ length: 3 }, (_, offset) => { const date = new Date(); date.setDate(date.getDate() + offset); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; });
  const forecastDateKeys = forecast ? [...new Set(forecast.hourly.time.map((time) => time.slice(0, 10)).filter((date) => date >= forecast.current.time.slice(0, 10)))].slice(0, 3) : fallbackDateKeys;
  const selectedDateKey = forecastDateKeys[dayOffset] ?? forecastDateKeys[0];
  const dateChoices = forecastDateKeys.map((date, offset) => ({ offset, date, title: offset === 0 ? "Сьогодні" : offset === 1 ? "Завтра" : "Післязавтра", detail: new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "short" }).format(new Date(`${date}T12:00:00`)) }));
  const candidateIndices = (() => {
    if (!forecast || !selectedDateKey) return [];
    const currentIndex = getCurrentIndex(forecast);
    return forecast.hourly.time.map((time, index) => ({ time, index })).filter(({ time, index }) => time.startsWith(selectedDateKey) && (dayOffset === 0 ? index >= currentIndex && index < currentIndex + 12 : Number(time.slice(11, 13)) >= 5 && Number(time.slice(11, 13)) <= 23)).map(({ index }) => index);
  })();
  const scoreAtIndex = (index: number) => {
    if (!forecast) return null;
    const time = forecast.hourly.time[index];
    const trends = getHistory(forecast, index);
    return scoreSpecies(species, {
      airTemperature: forecast.hourly.temperature_2m[index], waterTemperature: waterTemperature === "" ? undefined : Number(waterTemperature),
      windSpeed: forecast.hourly.wind_speed_10m[index], windGusts: forecast.hourly.wind_gusts_10m[index], cloudCover: forecast.hourly.cloud_cover[index],
      pressureTrend3h: trends.pressureTrend3h, temperatureTrend24h: trends.temperatureTrend24h, precipitation24h: trends.precipitation24h,
      isDay: forecast.hourly.is_day[index] === 1, hour: Number(time.slice(11, 13)), month: Number(time.slice(5, 7)), waterType, clarity, flow, hasStructure,
    });
  };
  const scoredHours = candidateIndices.map((index) => ({ index, time: forecast!.hourly.time[index].slice(11, 16), result: scoreAtIndex(index)! }));
  const bestHour = scoredHours.reduce<(typeof scoredHours)[number] | null>((best, row) => !best || row.result.score > best.result.score ? row : best, null);
  const score = bestHour?.result ?? null;
  const selectedWeather: CurrentWeather | null = forecast && bestHour ? { time: forecast.hourly.time[bestHour.index], temperature_2m: forecast.hourly.temperature_2m[bestHour.index], wind_speed_10m: forecast.hourly.wind_speed_10m[bestHour.index], wind_direction_10m: forecast.hourly.wind_direction_10m[bestHour.index], wind_gusts_10m: forecast.hourly.wind_gusts_10m[bestHour.index], pressure_msl: forecast.hourly.pressure_msl[bestHour.index], cloud_cover: forecast.hourly.cloud_cover[bestHour.index], precipitation: forecast.hourly.precipitation[bestHour.index], is_day: forecast.hourly.is_day[bestHour.index] } : null;
  const history = forecast && bestHour ? getHistory(forecast, bestHour.index) : null;

  const bestWindows = (() => {
    const rows = scoredHours.map((row) => ({ time: row.time, value: row.result.score }));
    if (!rows.length) return [];
    const peak = Math.max(...rows.map((row) => row.value));
    const threshold = Math.max(55, peak - 8);
    const groups: typeof rows[] = [];
    for (const row of rows) {
      if (row.value < threshold) continue;
      const current = groups.at(-1);
      const rowIndex = rows.indexOf(row);
      const previousIndex = current?.length ? rows.indexOf(current.at(-1)!) : -2;
      if (current && rowIndex === previousIndex + 1) current.push(row);
      else groups.push([row]);
    }
    return groups.map((group) => ({
      time: `${group[0].time}–${nextHour(group.at(-1)!.time)}`,
      value: Math.round(group.reduce((sum, row) => sum + row.value, 0) / group.length),
      peak: Math.max(...group.map((row) => row.value)),
      hours: group.length,
    })).sort((a, b) => b.peak - a.peak || b.hours - a.hours).slice(0, 2).sort((a, b) => a.time.localeCompare(b.time));
  })();

  function selectSuggestion(item: Suggestion) {
    setSelectedLocation(item); setQuery(item.name); setLocationSource("city"); setShowSuggestions(false);
    loadForecast(item, "city", `${item.name}${item.admin1 ? `, ${item.admin1}` : ""}`);
  }

  function handleSearchKey(event: KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setHighlighted((value) => Math.min(suggestions.length - 1, value + 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setHighlighted((value) => Math.max(0, value - 1)); }
    if (event.key === "Enter" && highlighted >= 0) { event.preventDefault(); selectSuggestion(suggestions[highlighted]); }
    if (event.key === "Escape") setShowSuggestions(false);
  }

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    const tabs: Tab[] = ["forecast", "conditions", "advice"];
    const current = tabs.indexOf(tab);
    let next = current;
    if (event.key === "ArrowRight") next = (current + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    setTab(tabs[next]);
    document.getElementById(`tab-${tabs[next]}`)?.focus();
  }

  async function loadForecast(location: Suggestion, source: LocationSource, label: string, accuracy?: number) {
    const requestId = ++forecastRequest.current;
    setSelectedLocation(location); setLocationSource(source); setActiveLocation(location); setActiveLocationSource(source); setActiveGpsAccuracy(source === "gps" ? accuracy ?? null : null); setLocationEditorOpen(false); setTab("forecast"); setLoading(true); setStatus("Оновлюю погодні дані…");
    try {
      const fresh = await requestForecast(location.latitude, location.longitude);
      if (requestId !== forecastRequest.current) return;
      setForecast(fresh);
      setStatus(`${label}. Дані оновлено.`);
    } catch { if (requestId === forecastRequest.current) { setForecast(null); setLocationEditorOpen(true); setStatus("Локацію збережено, але погоду не вдалося оновити. Спробуйте ще раз."); } }
    finally { if (requestId === forecastRequest.current) setLoading(false); }
  }

  function useGps() {
    if (!navigator.geolocation) { setStatus("Цей браузер не підтримує геолокацію. Вставте координати з Compass."); return; }
    setLoading(true); setStatus("Визначаю вашу точку…");
    navigator.geolocation.getCurrentPosition(
      (position) => { const location = { id: -1, name: "Ваша GPS-точка", latitude: position.coords.latitude, longitude: position.coords.longitude }; setCoordinateText(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`); setGpsAccuracy(position.coords.accuracy); loadForecast(location, "gps", "GPS-точка", position.coords.accuracy); },
      () => { setLoading(false); setStatus("Не вдалося визначити GPS. Вставте координати вручну."); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  function submitCoordinates(event: FormEvent) {
    event.preventDefault(); const parsed = parseCoordinates(coordinateText);
    if (!parsed) { setStatus("Не розпізнав координати. Приклад: 50.4501, 30.5234"); return; }
    setLocationSource("coordinates");
    const location = { id: -2, name: "Точка на водоймі", ...parsed };
    setSelectedLocation(location);
    loadForecast(location, "coordinates", "Координати застосовано");
  }

  function switchLocationMode(mode: LocationMode) {
    setLocationMode(mode); setShowSuggestions(false); setStatus("");
    window.setTimeout(() => document.getElementById(mode === "city" ? "location-search" : "coordinates")?.focus(), 0);
  }

  function editLocation() {
    const mode: LocationMode = activeLocationSource === "city" ? "city" : "coordinates";
    setSelectedLocation(activeLocation); setLocationSource(activeLocationSource); setGpsAccuracy(activeGpsAccuracy); setQuery(activeLocationSource === "city" ? activeLocation?.name ?? "" : ""); setCoordinateText(activeLocation && activeLocationSource !== "city" ? `${activeLocation.latitude.toFixed(4)}, ${activeLocation.longitude.toFixed(4)}` : ""); setLocationMode(mode); setLocationEditorOpen(true); setStatus("");
    window.setTimeout(() => document.getElementById(mode === "city" ? "location-search" : "coordinates")?.focus(), 60);
  }

  function cancelLocationEdit() {
    setSelectedLocation(activeLocation); setLocationSource(activeLocationSource); setGpsAccuracy(activeGpsAccuracy); setQuery(activeLocationSource === "city" ? activeLocation?.name ?? "" : ""); setLocationEditorOpen(false);
    window.setTimeout(() => locationButton.current?.focus(), 0);
  }

  function refreshPage() {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    window.location.reload();
  }

  function clearSavedData() {
    ++forecastRequest.current;
    skipPersistence.current = true;
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* Storage may be unavailable. */ }
    setSpecies("pike"); setDayOffset(0); setQuery(""); setSuggestions([]); setSelectedLocation(null); setActiveLocation(null); setLocationSource("city"); setActiveLocationSource("city"); setGpsAccuracy(null); setActiveGpsAccuracy(null); setCoordinateText(""); setLocationMode("city"); setLocationEditorOpen(true); setForecast(null); setLoading(false); setTab("forecast"); setWaterType("unknown"); setClarity("unknown"); setFlow("unknown"); setWaterTemperature(""); setHasStructure(false); setStatus("");
  }

  const activeLocationLabel = activeLocation ? `${activeLocation.name}${activeLocation.admin1 ? `, ${activeLocation.admin1}` : ""}` : "Локацію не вибрано";
  const activePrecisionText = activeLocationSource === "city" ? "орієнтовно за містом" : activeLocationSource === "gps" ? `GPS-точка${activeGpsAccuracy ? ` · ±${Math.round(activeGpsAccuracy)} м` : ""}` : activeLocation ? `точні координати · ${activeLocation.latitude.toFixed(4)}, ${activeLocation.longitude.toFixed(4)}` : "";
  const popularSpecies: SpeciesId[] = ["pike", "zander", "perch", "carp"];
  const visibleSpecies = showAllSpecies ? SPECIES : SPECIES.filter((item) => popularSpecies.includes(item.id) || item.id === species);

  return <main>
    <header className="topbar"><button className="brand" type="button" aria-label="Оновити сторінку й прогноз" onClick={refreshPage}><span className="logo-mark" aria-hidden="true">◒</span><span className="brand-copy"><b>КЛЬОВ</b><small>Планувальник риболовлі</small></span></button><button ref={locationButton} className="header-location" type="button" aria-expanded={locationEditorOpen} aria-controls="location-editor" onClick={locationEditorOpen ? cancelLocationEdit : editLocation} aria-label={activeLocation ? `Змінити локацію: ${activeLocationLabel}` : "Вказати локацію"}><MapPin size={16} aria-hidden="true" /><span><b>{activeLocation ? activeLocation.name : "Вказати локацію"}</b></span><Pencil size={14} aria-hidden="true" /></button></header>
    <section className="hero"><p className="eyebrow">Погодні умови для риболовлі</p><h1>Прогноз для <i>вашої точки.</i></h1><p>Оберіть місце й рибу — решту пояснимо простими словами.</p></section>

    <section className="card planner-card"><div id="location-editor" className="location-step"><div className="location-panel-head"><div className="location-panel-title"><i>01</i><div><b>Локація прогнозу</b><span>{activeLocation && !locationEditorOpen ? `${activeLocationLabel} · ${activePrecisionText}` : "Оберіть місто або вкажіть точну точку водойми."}</span></div></div>{activeLocation && !locationEditorOpen ? <button type="button" onClick={editLocation}>Змінити</button> : activeLocation ? <button type="button" onClick={cancelLocationEdit}>Закрити</button> : null}</div>
      {locationEditorOpen && <div className="location-panel-body"><div className="location-method-head"><div><b>{locationMode === "city" ? "Місто або найближчий населений пункт" : "Точна точка водойми"}</b><span>{locationMode === "city" ? "Оберіть населений пункт зі списку." : "Вставте координати або визначте їх через GPS."}</span></div><button type="button" aria-controls="location-mode-fields" disabled={loading} onClick={() => switchLocationMode(locationMode === "city" ? "coordinates" : "city")}>{locationMode === "city" ? "Вказати координати" : "Вказати місто"}</button></div><div id="location-mode-fields">{locationMode === "city" ? <div className="combobox"><input ref={searchInput} id="location-search" aria-label="Місто або найближчий населений пункт" value={query} autoComplete="off" placeholder="Наприклад, Канів" role="combobox" aria-autocomplete="list" aria-expanded={showSuggestions} aria-controls="location-list" aria-activedescendant={highlighted >= 0 ? `location-option-${suggestions[highlighted]?.id}` : undefined} onKeyDown={handleSearchKey} onChange={(event) => { const value = event.target.value; setQuery(value); setSelectedLocation(null); setSuggestions(value.trim().length < 2 ? [] : suggestions); setShowSuggestions(value.trim().length >= 2); }} onFocus={() => { if (suggestions.length) setShowSuggestions(true); }} />{showSuggestions && query.trim().length >= 2 && <div className="suggestions" id="location-list" role="listbox">{suggestions.length ? suggestions.map((item, index) => <button type="button" id={`location-option-${item.id}`} role="option" tabIndex={-1} aria-selected={highlighted === index} className={`suggestion-option${highlighted === index ? " highlighted" : ""}`} key={item.id} onMouseDown={(event) => event.preventDefault()} onClick={() => selectSuggestion(item)}><b>{item.name}</b><span>{[item.admin1, item.country].filter(Boolean).join(" · ")}</span></button>) : <div className="no-results"><b>Збігів немає</b><span>Уточніть назву або вкажіть координати.</span></div>}</div>}</div> : <form className="precise-fields" onSubmit={submitCoordinates}><input id="coordinates" aria-label="Широта й довгота" value={coordinateText} onChange={(event) => setCoordinateText(event.target.value)} placeholder="50.4501° N, 30.5234° E" inputMode="text" /><button type="button" className="gps-inline" onClick={useGps} disabled={loading}>⌖ GPS</button><button type="submit" disabled={loading || !coordinateText.trim()}>Застосувати</button></form>}</div>{(loading || status) && <p className="status" role="status" aria-live="polite">{loading && <span className="spinner" />} {status}</p>}</div>}
    </div>
      <div className="planner-divider" />
      <fieldset className="date-picker"><legend><span>02</span>Коли рибалимо?</legend><div>{dateChoices.map((choice) => <label key={choice.date} htmlFor={`forecast-day-${choice.offset}`} aria-label={`${choice.title}, ${choice.detail}`} className={dayOffset === choice.offset ? "selected" : ""}><input id={`forecast-day-${choice.offset}`} type="radio" name="forecast-day" value={choice.offset} checked={dayOffset === choice.offset} onChange={() => setDayOffset(choice.offset)} /><span><b>{choice.title}</b><small>{choice.detail}</small></span></label>)}</div><p>Три дні — оптимальний горизонт для точного погодного прогнозу.</p></fieldset>
      <div className="planner-divider" />
      <div className="section-heading species-heading"><div><span>03</span><h2>Що ловимо?</h2></div><p>Оцінка й поради автоматично адаптуються до виду.</p></div>
      <div className="chips">{visibleSpecies.map((item) => <button type="button" key={item.id} className={species === item.id ? "chip active" : "chip"} aria-pressed={species === item.id} onClick={() => setSpecies(item.id)}>{item.name}</button>)}<button type="button" className="chip more" aria-expanded={showAllSpecies} onClick={() => setShowAllSpecies((value) => !value)}>{showAllSpecies ? "Менше" : "Усі види · +4"}</button></div>
      <div className="privacy-row"><span>Збережено лише на цьому пристрої</span><button type="button" onClick={clearSavedData}>Очистити дані</button></div>
    </section>

    {forecast && score && history && selectedWeather && <section className="result-card">
      <div className="result-head"><div className="result-kicker"><b>{SPECIES.find((item) => item.id === species)?.name}</b><span>{dateChoices[dayOffset]?.title.toLowerCase()}</span></div><div className="result-summary"><div className="score-line"><strong>{score.score}</strong><span>/100</span></div><div className="result-copy"><h2>{labelScore(score.score)} умови</h2><p><span>Упевненість</span><b>{confidenceLabel(score.confidence)}</b><i>·</i><span>{score.confidence}% даних</span></p></div></div></div>
      <div className="tabs" role="tablist" aria-label="Результати прогнозу">{(["forecast", "conditions", "advice"] as Tab[]).map((item) => <button key={item} id={`tab-${item}`} role="tab" tabIndex={tab === item ? 0 : -1} aria-selected={tab === item} aria-controls={`panel-${item}`} onKeyDown={handleTabKey} onClick={() => setTab(item)}>{item === "forecast" ? "Прогноз" : item === "conditions" ? "Умови" : "Поради"}</button>)}</div>
      {tab === "forecast" && <div className="tab-panel" role="tabpanel" id="panel-forecast" aria-labelledby="tab-forecast"><h3>{dayOffset === 0 ? "Найкращий час у наступні 12 годин" : "Найкращий час обраного дня"}</h3><div className="windows">{bestWindows.map((window) => <div key={window.time}><b>{window.time}</b><span>{window.value}/100 · {window.hours === 1 ? "1 година" : `${window.hours} год`}</span></div>)}</div><h3>Що вплинуло</h3><div className="drivers">{score.drivers.map((driver) => { const DriverIcon = driverIcons[driver.kind]; const ToneIcon = toneIcons[driver.tone]; return <div key={driver.text} className={driver.tone}><span className="driver-icon"><DriverIcon size={17} strokeWidth={2} aria-hidden="true" /></span><p>{driver.text}</p><span className="driver-tone"><ToneIcon size={13} strokeWidth={2.5} aria-hidden="true" /></span></div>; })}</div></div>}
      {tab === "conditions" && <div className="tab-panel" role="tabpanel" id="panel-conditions" aria-labelledby="tab-conditions"><div className="weather-grid"><article><span>Температура</span><b>{selectedWeather.temperature_2m.toFixed(1)}°C</b><small>{history.temperatureTrend24h >= 0 ? "+" : ""}{history.temperatureTrend24h.toFixed(1)}° за 24 год</small></article><article><span>Вітер</span><b>{Math.round(selectedWeather.wind_speed_10m)} км/год</b><small>{windNames[Math.round(selectedWeather.wind_direction_10m / 45) % 8]} · пориви {Math.round(selectedWeather.wind_gusts_10m)}</small></article><article><span>Тиск</span><b>{Math.round(selectedWeather.pressure_msl)} гПа</b><small>{history.pressureTrend3h >= 0 ? "+" : ""}{history.pressureTrend3h.toFixed(1)} за 3 год</small></article><article><span>Небо й опади</span><b>{Math.round(selectedWeather.cloud_cover)}% хмар</b><small>{history.precipitation24h.toFixed(1)} мм за 24 год</small></article></div><button type="button" className="water-toggle" aria-expanded={waterDetailsOpen} aria-controls="water-details" onClick={() => setWaterDetailsOpen((value) => !value)}><span><b>Уточнити прогноз</b><small>Додайте умови водойми — індекс стане точнішим</small></span><strong aria-hidden="true">{waterDetailsOpen ? "−" : "+"}</strong></button>{waterDetailsOpen && <div className="water-form" id="water-details"><h3>Дані водойми</h3><p>Ці параметри неможливо надійно визначити лише за містом.</p><div className="form-grid"><label>Тип водойми<select value={waterType} onChange={(event) => setWaterType(event.target.value as WaterType)}><option value="unknown">Не знаю</option><option value="river">Річка</option><option value="lake">Озеро</option><option value="reservoir">Водосховище</option><option value="pond">Ставок</option></select></label><label>Прозорість<select value={clarity} onChange={(event) => setClarity(event.target.value as Clarity)}><option value="unknown">Не знаю</option><option value="clear">Прозора</option><option value="stained">Злегка мутна</option><option value="murky">Мутна</option></select></label><label>Течія<select value={flow} onChange={(event) => setFlow(event.target.value as Flow)}><option value="unknown">Не знаю</option><option value="still">Немає</option><option value="slow">Слабка</option><option value="moderate">Помірна</option><option value="fast">Сильна</option></select></label><label>Температура води, °C<input type="number" min="0" max="35" step="0.5" value={waterTemperature} onChange={(event) => setWaterTemperature(event.target.value)} placeholder="необов’язково" /></label></div><label className="check"><input type="checkbox" checked={hasStructure} onChange={(event) => setHasStructure(event.target.checked)} /> Є трава, бровка, корчі або інше укриття</label></div>}</div>}
      {tab === "advice" && <div className="tab-panel" role="tabpanel" id="panel-advice" aria-labelledby="tab-advice"><div className="tactic"><span>Тактика для виду</span><h3>{SPECIES.find((item) => item.id === species)?.name}</h3><p>{score.tactic}</p></div><h3>Складові індексу</h3><div className="breakdown">{score.parts.map((part) => <div key={part.label}><div><b>{part.label}</b><small>{part.note}</small></div><div className="bar"><span style={{ width: `${part.value}%` }} /></div><strong>{part.value || "—"}</strong></div>)}</div><p className="disclaimer">Це погодний індекс, а не ймовірність улову. Реальний результат залежить від водойми, рибальського тиску, снасті та техніки. Перевіряйте місцеві правила й обмеження.</p></div>}
    </section>}
    <footer><span>Погода й геокодування: <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open‑Meteo</a></span><span>Водні дані не вигадуємо — їх додає рибалка.</span></footer>
  </main>;
}
