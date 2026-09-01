import type { FormEvent } from "react";
import type { FishingPlanner } from "../hooks/use-fishing-planner";
import type { LocationMode, LocationSuggestion } from "../types/planner";
import { SmoothHeight } from "./smooth-height";

type LocationSearchState = FishingPlanner["locationSearch"];

type CityComboboxProps = {
  search: LocationSearchState;
};

function CityCombobox({ search }: CityComboboxProps) {
  return (
    <div className="combobox">
      <input
        id="location-search"
        aria-label="Місто або найближчий населений пункт"
        value={search.query}
        autoComplete="off"
        placeholder="Наприклад, Канів"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={search.showSuggestions}
        aria-controls="location-list"
        aria-activedescendant={
          search.highlighted >= 0
            ? `location-option-${search.suggestions[search.highlighted]?.id}`
            : undefined
        }
        onKeyDown={search.handleKeyDown}
        onChange={(event) => search.changeQuery(event.target.value)}
        onFocus={() => {
          if (search.suggestions.length) search.setShowSuggestions(true);
        }}
      />

      {search.showSuggestions && search.query.trim().length >= 2 ? (
        <div className="suggestions" id="location-list" role="listbox">
          {search.suggestions.length ? (
            search.suggestions.map((item, index) => (
              <button
                type="button"
                id={`location-option-${item.id}`}
                role="option"
                tabIndex={-1}
                aria-selected={search.highlighted === index}
                className={`suggestion-option${
                  search.highlighted === index ? " highlighted" : ""
                }`}
                key={item.id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => search.selectSuggestion(item)}
              >
                <b>{item.name}</b>
                <span>
                  {[item.admin1, item.country].filter(Boolean).join(" · ")}
                </span>
              </button>
            ))
          ) : (
            <div className="no-results">
              <b>Збігів немає</b>
              <span>Уточніть назву або вкажіть координати.</span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

type CoordinateInputProps = {
  coordinateText: string;
  loading: boolean;
  onCoordinateChange: (value: string) => void;
  onGps: () => void;
  onSubmit: (event: FormEvent) => void;
};

function CoordinateInput({
  coordinateText,
  loading,
  onCoordinateChange,
  onGps,
  onSubmit,
}: CoordinateInputProps) {
  return (
    <form className="precise-fields" onSubmit={onSubmit}>
      <input
        id="coordinates"
        aria-label="Широта й довгота"
        value={coordinateText}
        onChange={(event) => onCoordinateChange(event.target.value)}
        placeholder="50.4501° N, 30.5234° E"
        inputMode="text"
      />
      <button
        type="button"
        className="gps-inline"
        onClick={onGps}
        disabled={loading}
      >
        ⌖ GPS
      </button>
      <button type="submit" disabled={loading || !coordinateText.trim()}>
        Застосувати
      </button>
    </form>
  );
}

type LocationStepProps = {
  activeLocation: LocationSuggestion | null;
  activeLocationLabel: string;
  activePrecisionText: string;
  coordinateText: string;
  editorOpen: boolean;
  loading: boolean;
  mode: LocationMode;
  search: LocationSearchState;
  status: string;
  onCancel: () => void;
  onCoordinateChange: (value: string) => void;
  onEdit: () => void;
  onGps: () => void;
  onModeChange: (mode: LocationMode) => void;
  onSubmitCoordinates: (event: FormEvent) => void;
};

export function LocationStep({
  activeLocation,
  activeLocationLabel,
  activePrecisionText,
  coordinateText,
  editorOpen,
  loading,
  mode,
  search,
  status,
  onCancel,
  onCoordinateChange,
  onEdit,
  onGps,
  onModeChange,
  onSubmitCoordinates,
}: LocationStepProps) {
  const alternativeMode = mode === "city" ? "coordinates" : "city";

  return (
    <div id="location-editor" className="location-step">
      <div className="location-panel-head">
        <div className="location-panel-title">
          <i>01</i>
          <div>
            <b>Локація прогнозу</b>
            <span>
              {activeLocation && !editorOpen
                ? `${activeLocationLabel} · ${activePrecisionText}`
                : "Оберіть місто або вкажіть точну точку водойми."}
            </span>
          </div>
        </div>

        {activeLocation && !editorOpen ? (
          <button type="button" onClick={onEdit}>
            Змінити
          </button>
        ) : activeLocation ? (
          <button type="button" onClick={onCancel}>
            Закрити
          </button>
        ) : null}
      </div>

      <SmoothHeight className="location-editor-height">
        {editorOpen ? (
          <div className="location-panel-body">
            <div className="location-method-head">
              <div>
                <b>
                  {mode === "city"
                    ? "Місто або найближчий населений пункт"
                    : "Точна точка водойми"}
                </b>
                <span>
                  {mode === "city"
                    ? "Оберіть населений пункт зі списку."
                    : "Вставте координати або визначте їх через GPS."}
                </span>
              </div>
              <button
                type="button"
                aria-controls="location-mode-fields"
                disabled={loading}
                onClick={() => onModeChange(alternativeMode)}
              >
                {mode === "city" ? "Вказати координати" : "Вказати місто"}
              </button>
            </div>

            <div id="location-mode-fields">
              {mode === "city" ? (
                <CityCombobox search={search} />
              ) : (
                <CoordinateInput
                  coordinateText={coordinateText}
                  loading={loading}
                  onCoordinateChange={onCoordinateChange}
                  onGps={onGps}
                  onSubmit={onSubmitCoordinates}
                />
              )}
            </div>

            {loading || status ? (
              <p className="status" role="status" aria-live="polite">
                {loading ? <span className="spinner" /> : null} {status}
              </p>
            ) : null}
          </div>
        ) : null}
      </SmoothHeight>
    </div>
  );
}
