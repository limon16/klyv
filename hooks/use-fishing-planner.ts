"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { parseCoordinates } from "../lib/coordinates";
import { buildForecastViewModel } from "../lib/forecast-view-model";
import {
  type Clarity,
  type Flow,
  SPECIES,
  type SpeciesId,
  type WaterType,
} from "../lib/fish-model";
import { requestIpLocation } from "../lib/ip-location";
import { requestForecast } from "../lib/open-meteo";
import {
  clearPlannerState,
  readPlannerState,
  writePlannerState,
} from "../lib/planner-storage";
import type {
  ForecastData,
  LocationMode,
  LocationSource,
  LocationSuggestion,
  PersistedInput,
  ResultTab,
  WaterSettings,
} from "../types/planner";
import { useLocationSearch } from "./use-location-search";

const DEFAULT_WATER: WaterSettings = {
  waterType: "unknown",
  clarity: "unknown",
  flow: "unknown",
  waterTemperature: "",
  hasStructure: false,
};

const POPULAR_SPECIES: SpeciesId[] = ["pike", "zander", "perch", "carp"];
const RESULT_TABS: ResultTab[] = ["forecast", "conditions", "advice"];

export function useFishingPlanner() {
  const [species, setSpecies] = useState<SpeciesId>("pike");
  const [selectedLocation, setSelectedLocation] =
    useState<LocationSuggestion | null>(null);
  const [activeLocation, setActiveLocation] =
    useState<LocationSuggestion | null>(null);
  const [activeLocationSource, setActiveLocationSource] =
    useState<LocationSource>("city");
  const [activeGpsAccuracy, setActiveGpsAccuracy] = useState<number | null>(
    null,
  );
  const [locationEditorOpen, setLocationEditorOpen] = useState(true);
  const [locationMode, setLocationMode] = useState<LocationMode>("city");
  const [coordinateText, setCoordinateText] = useState("");
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [dayOffset, setDayOffset] = useState(0);
  const [tab, setTab] = useState<ResultTab>("forecast");
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

  const forecastRequest = useRef(0);
  const autoLocationCancelled = useRef(false);
  const skipPersistence = useRef(false);
  const locationButton = useRef<HTMLButtonElement>(null);

  const loadForecast = useCallback(
    async (
      location: LocationSuggestion,
      source: LocationSource,
      label: string,
      accuracy?: number,
    ) => {
      const requestId = ++forecastRequest.current;
      setSelectedLocation(location);
      setActiveLocation(location);
      setActiveLocationSource(source);
      setActiveGpsAccuracy(source === "gps" ? (accuracy ?? null) : null);
      setLocationEditorOpen(false);
      setTab("forecast");
      setLoading(true);
      setStatus("Оновлюю погодні дані…");

      try {
        const fresh = await requestForecast(
          location.latitude,
          location.longitude,
        );
        if (requestId !== forecastRequest.current) return;

        setForecast(fresh);
        setStatus(`${label}. Дані оновлено.`);
      } catch {
        if (requestId === forecastRequest.current) {
          setForecast(null);
          setLocationEditorOpen(true);
          setStatus(
            "Локацію збережено, але погоду не вдалося оновити. Спробуйте ще раз.",
          );
        }
      } finally {
        if (requestId === forecastRequest.current) setLoading(false);
      }
    },
    [],
  );

  const selectCity = useCallback(
    (location: LocationSuggestion) => {
      autoLocationCancelled.current = true;
      loadForecast(
        location,
        "city",
        `${location.name}${location.admin1 ? `, ${location.admin1}` : ""}`,
      );
    },
    [loadForecast],
  );

  const reportSearchError = useCallback((message: string) => {
    setStatus(message);
  }, []);

  const locationSearch = useLocationSearch({
    selectedLocation,
    onSelect: selectCity,
    onError: reportSearchError,
  });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const saved = readPlannerState();
      if (cancelled) return;

      if (saved) {
        setSpecies(saved.species);
        setSelectedLocation(saved.location);
        setActiveLocation(saved.location);
        setActiveLocationSource(saved.location?.source ?? "city");
        setLocationMode(
          saved.location?.source === "city" ? "city" : "coordinates",
        );
        locationSearch.setQuery(
          saved.location?.source === "city" ? saved.location.name : "",
        );
        setCoordinateText(
          saved.location?.source === "coordinates"
            ? `${saved.location.latitude.toFixed(4)}, ${saved.location.longitude.toFixed(4)}`
            : "",
        );
        setWaterType(saved.water.waterType);
        setClarity(saved.water.clarity);
        setFlow(saved.water.flow);
        setWaterTemperature(saved.water.waterTemperature);
        setHasStructure(saved.water.hasStructure);
      }
      setHydrated(true);

      if (!saved?.location) {
        const forecastVersion = forecastRequest.current;
        setLocationMode("city");
        setLocationEditorOpen(true);
        setStatus("Визначаю приблизне місто…");

        try {
          const location = await requestIpLocation(controller.signal);
          if (
            cancelled ||
            autoLocationCancelled.current ||
            forecastRequest.current !== forecastVersion
          ) {
            return;
          }

          if (!location) {
            setStatus("");
            return;
          }

          locationSearch.setQuery(location.name);
          await loadForecast(
            location,
            "city",
            `${location.name} · приблизно за IP`,
          );
        } catch (error) {
          if ((error as Error).name !== "AbortError" && !cancelled) {
            setStatus("");
          }
        }
        return;
      }

      setLocationEditorOpen(false);
      const requestId = ++forecastRequest.current;
      setStatus("Відновили останню точку. Оновлюємо погоду…");
      try {
        const fresh = await requestForecast(
          saved.location.latitude,
          saved.location.longitude,
        );
        if (!cancelled && requestId === forecastRequest.current) {
          setForecast(fresh);
          setStatus("Останню точку відновлено. Погоду оновлено.");
        }
      } catch {
        if (!cancelled && requestId === forecastRequest.current) {
          setStatus(
            "Останню точку відновлено, але погоду поки не вдалося оновити.",
          );
        }
      }
    }, 0);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
    // The search setter is stable; hydration intentionally runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipPersistence.current) {
      skipPersistence.current = false;
      return;
    }

    const snapshot: PersistedInput = {
      version: 1,
      savedAt: new Date().toISOString(),
      species,
      location: activeLocation
        ? { ...activeLocation, source: activeLocationSource }
        : null,
      water: {
        waterType,
        clarity,
        flow,
        waterTemperature,
        hasStructure,
      },
    };
    writePlannerState(snapshot);
  }, [
    activeLocation,
    activeLocationSource,
    clarity,
    flow,
    hasStructure,
    hydrated,
    species,
    waterTemperature,
    waterType,
  ]);

  const water = useMemo<WaterSettings>(
    () => ({ waterType, clarity, flow, waterTemperature, hasStructure }),
    [clarity, flow, hasStructure, waterTemperature, waterType],
  );
  const view = useMemo(
    () => buildForecastViewModel({ forecast, dayOffset, species, water }),
    [dayOffset, forecast, species, water],
  );

  function useGps() {
    autoLocationCancelled.current = true;
    if (!navigator.geolocation) {
      setStatus(
        "Цей браузер не підтримує геолокацію. Вставте координати з Compass.",
      );
      return;
    }

    setLoading(true);
    setStatus("Визначаю вашу точку…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          id: -1,
          name: "Ваша GPS-точка",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCoordinateText(
          `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
        );
        loadForecast(location, "gps", "GPS-точка", position.coords.accuracy);
      },
      () => {
        setLoading(false);
        setStatus("Не вдалося визначити GPS. Вставте координати вручну.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  function submitCoordinates(event: FormEvent) {
    event.preventDefault();
    autoLocationCancelled.current = true;
    const parsed = parseCoordinates(coordinateText);
    if (!parsed) {
      setStatus("Не розпізнав координати. Приклад: 50.4501, 30.5234");
      return;
    }

    const location = { id: -2, name: "Точка на водоймі", ...parsed };
    setSelectedLocation(location);
    loadForecast(location, "coordinates", "Координати застосовано");
  }

  function switchLocationMode(mode: LocationMode) {
    autoLocationCancelled.current = true;
    setLocationMode(mode);
    locationSearch.setShowSuggestions(false);
    setStatus("");
    window.setTimeout(
      () =>
        document
          .getElementById(mode === "city" ? "location-search" : "coordinates")
          ?.focus(),
      0,
    );
  }

  function editLocation() {
    autoLocationCancelled.current = true;
    const mode: LocationMode =
      activeLocationSource === "city" ? "city" : "coordinates";
    setSelectedLocation(activeLocation);
    locationSearch.setQuery(
      activeLocationSource === "city" ? (activeLocation?.name ?? "") : "",
    );
    setCoordinateText(
      activeLocation && activeLocationSource !== "city"
        ? `${activeLocation.latitude.toFixed(4)}, ${activeLocation.longitude.toFixed(4)}`
        : "",
    );
    setLocationMode(mode);
    setLocationEditorOpen(true);
    setStatus("");
    window.setTimeout(
      () =>
        document
          .getElementById(mode === "city" ? "location-search" : "coordinates")
          ?.focus(),
      60,
    );
  }

  function cancelLocationEdit() {
    setSelectedLocation(activeLocation);
    locationSearch.setQuery(
      activeLocationSource === "city" ? (activeLocation?.name ?? "") : "",
    );
    setLocationEditorOpen(false);
    window.setTimeout(() => locationButton.current?.focus(), 0);
  }

  function handleHeaderLocationClick() {
    autoLocationCancelled.current = true;

    if (!activeLocation) {
      setLocationEditorOpen(true);
      setStatus("");
      window.setTimeout(
        () =>
          document
            .getElementById(
              locationMode === "city" ? "location-search" : "coordinates",
            )
            ?.focus(),
        0,
      );
      return;
    }

    if (locationEditorOpen) cancelLocationEdit();
    else editLocation();
  }

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    const current = RESULT_TABS.indexOf(tab);
    let next = current;

    if (event.key === "ArrowRight") next = (current + 1) % RESULT_TABS.length;
    else if (event.key === "ArrowLeft") {
      next = (current - 1 + RESULT_TABS.length) % RESULT_TABS.length;
    } else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = RESULT_TABS.length - 1;
    else return;

    event.preventDefault();
    setTab(RESULT_TABS[next]);
    document.getElementById(`tab-${RESULT_TABS[next]}`)?.focus();
  }

  function refreshPage() {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
    window.location.reload();
  }

  function clearSavedData() {
    ++forecastRequest.current;
    autoLocationCancelled.current = true;
    skipPersistence.current = true;
    clearPlannerState();
    setSpecies("pike");
    setDayOffset(0);
    locationSearch.reset();
    setSelectedLocation(null);
    setActiveLocation(null);
    setActiveLocationSource("city");
    setActiveGpsAccuracy(null);
    setCoordinateText("");
    setLocationMode("city");
    setLocationEditorOpen(true);
    setForecast(null);
    setLoading(false);
    setTab("forecast");
    setWaterType(DEFAULT_WATER.waterType);
    setClarity(DEFAULT_WATER.clarity);
    setFlow(DEFAULT_WATER.flow);
    setWaterTemperature(DEFAULT_WATER.waterTemperature);
    setHasStructure(DEFAULT_WATER.hasStructure);
    setStatus("");
  }

  function changeLocationQuery(value: string) {
    autoLocationCancelled.current = true;
    locationSearch.changeQuery(value);
    setSelectedLocation(null);
  }

  const activeLocationLabel = activeLocation
    ? `${activeLocation.name}${activeLocation.admin1 ? `, ${activeLocation.admin1}` : ""}`
    : "Локацію не вибрано";
  const activePrecisionText =
    activeLocationSource === "city"
      ? "орієнтовно за містом"
      : activeLocationSource === "gps"
        ? `GPS-точка${activeGpsAccuracy ? ` · ±${Math.round(activeGpsAccuracy)} м` : ""}`
        : activeLocation
          ? `точні координати · ${activeLocation.latitude.toFixed(4)}, ${activeLocation.longitude.toFixed(4)}`
          : "";
  const visibleSpecies = showAllSpecies
    ? SPECIES
    : SPECIES.filter(
        (item) => POPULAR_SPECIES.includes(item.id) || item.id === species,
      );

  return {
    species,
    setSpecies,
    visibleSpecies,
    showAllSpecies,
    setShowAllSpecies,
    selectedLocation,
    activeLocation,
    activeLocationLabel,
    activePrecisionText,
    locationEditorOpen,
    locationMode,
    coordinateText,
    setCoordinateText,
    locationButton,
    locationSearch: { ...locationSearch, changeQuery: changeLocationQuery },
    editLocation,
    cancelLocationEdit,
    handleHeaderLocationClick,
    switchLocationMode,
    submitCoordinates,
    useGps,
    dayOffset,
    setDayOffset,
    tab,
    setTab,
    handleTabKey,
    forecast,
    loading,
    status,
    water,
    setWaterType,
    setClarity,
    setFlow,
    setWaterTemperature,
    setHasStructure,
    waterDetailsOpen,
    setWaterDetailsOpen,
    view,
    refreshPage,
    clearSavedData,
  };
}

export type FishingPlanner = ReturnType<typeof useFishingPlanner>;
