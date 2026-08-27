"use client";

import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { searchLocations } from "../lib/open-meteo";
import type { LocationSuggestion } from "../types/planner";

type UseLocationSearchOptions = {
  selectedLocation: LocationSuggestion | null;
  onSelect: (location: LocationSuggestion) => void;
  onError: (message: string) => void;
};

export function useLocationSearch({
  selectedLocation,
  onSelect,
  onError,
}: UseLocationSearchOptions) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const searchRequest = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || selectedLocation?.name === trimmed) return;

    const requestId = ++searchRequest.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const results = await searchLocations(trimmed, controller.signal);
        if (requestId !== searchRequest.current) return;

        setSuggestions(results);
        setShowSuggestions(true);
        setHighlighted(-1);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          onError(
            "Пошук місць тимчасово недоступний. Спробуйте GPS або координати.",
          );
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [onError, query, selectedLocation]);

  function changeQuery(value: string) {
    setQuery(value);
    setSuggestions(value.trim().length < 2 ? [] : suggestions);
    setShowSuggestions(value.trim().length >= 2);
  }

  function selectSuggestion(item: LocationSuggestion) {
    setQuery(item.name);
    setShowSuggestions(false);
    onSelect(item);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((value) => Math.min(suggestions.length - 1, value + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((value) => Math.max(0, value - 1));
    } else if (event.key === "Enter" && highlighted >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[highlighted]);
    } else if (event.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  function reset(value = "") {
    setQuery(value);
    setSuggestions([]);
    setShowSuggestions(false);
    setHighlighted(-1);
  }

  return {
    query,
    setQuery,
    suggestions,
    showSuggestions,
    setShowSuggestions,
    highlighted,
    changeQuery,
    selectSuggestion,
    handleKeyDown,
    reset,
  };
}
