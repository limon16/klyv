import type { Dispatch, SetStateAction } from "react";
import type { FishingPlanner } from "../hooks/use-fishing-planner";
import type { SpeciesId } from "../lib/fish-model";
import type { DateChoice } from "../types/planner";
import { LocationStep } from "./location-step";
import { SmoothHeight } from "./smooth-height";

type DatePickerProps = {
  choices: DateChoice[];
  selectedOffset: number;
  onChange: (offset: number) => void;
};

function DatePicker({ choices, selectedOffset, onChange }: DatePickerProps) {
  return (
    <fieldset className="date-picker">
      <legend>
        <span>02</span>
        Коли рибалимо?
      </legend>
      <div>
        {choices.map((choice) => (
          <label
            key={choice.date}
            htmlFor={`forecast-day-${choice.offset}`}
            aria-label={`${choice.title}, ${choice.detail}`}
            className={selectedOffset === choice.offset ? "selected" : ""}
          >
            <input
              id={`forecast-day-${choice.offset}`}
              type="radio"
              name="forecast-day"
              value={choice.offset}
              checked={selectedOffset === choice.offset}
              onChange={() => onChange(choice.offset)}
            />
            <span>
              <b>{choice.title}</b>
              <small>{choice.detail}</small>
            </span>
          </label>
        ))}
      </div>
      <p>Три дні — оптимальний горизонт для точного погодного прогнозу.</p>
    </fieldset>
  );
}

type SpeciesPickerProps = {
  selectedSpecies: SpeciesId;
  species: FishingPlanner["visibleSpecies"];
  showAll: boolean;
  onSelect: Dispatch<SetStateAction<SpeciesId>>;
  onToggleAll: Dispatch<SetStateAction<boolean>>;
};

function SpeciesPicker({
  selectedSpecies,
  species,
  showAll,
  onSelect,
  onToggleAll,
}: SpeciesPickerProps) {
  return (
    <>
      <div className="section-heading species-heading">
        <div>
          <span>03</span>
          <h2>Що ловимо?</h2>
        </div>
        <p>Оцінка й поради автоматично адаптуються до виду.</p>
      </div>
      <SmoothHeight className="species-height">
        <div className="chips">
          {species.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selectedSpecies === item.id ? "chip active" : "chip"}
              aria-pressed={selectedSpecies === item.id}
              onClick={() => onSelect(item.id)}
            >
              {item.name}
            </button>
          ))}
          <button
            type="button"
            className="chip more"
            aria-expanded={showAll}
            onClick={() => onToggleAll((value) => !value)}
          >
            {showAll ? "Менше" : "Усі види · +4"}
          </button>
        </div>
      </SmoothHeight>
    </>
  );
}

type PlannerCardProps = {
  planner: FishingPlanner;
};

export function PlannerCard({ planner }: PlannerCardProps) {
  return (
    <section className="card planner-card">
      <LocationStep
        activeLocation={planner.activeLocation}
        activeLocationLabel={planner.activeLocationLabel}
        activePrecisionText={planner.activePrecisionText}
        coordinateText={planner.coordinateText}
        editorOpen={planner.locationEditorOpen}
        loading={planner.loading}
        mode={planner.locationMode}
        search={planner.locationSearch}
        status={planner.status}
        onCancel={planner.cancelLocationEdit}
        onCoordinateChange={planner.setCoordinateText}
        onEdit={planner.editLocation}
        onGps={planner.useGps}
        onModeChange={planner.switchLocationMode}
        onSubmitCoordinates={planner.submitCoordinates}
      />

      <div className="planner-divider" />

      <DatePicker
        choices={planner.view.dateChoices}
        selectedOffset={planner.dayOffset}
        onChange={planner.setDayOffset}
      />

      <div className="planner-divider" />

      <SpeciesPicker
        selectedSpecies={planner.species}
        species={planner.visibleSpecies}
        showAll={planner.showAllSpecies}
        onSelect={planner.setSpecies}
        onToggleAll={planner.setShowAllSpecies}
      />

      <div className="privacy-row">
        <span>Збережено лише на цьому пристрої</span>
        <button type="button" onClick={planner.clearSavedData}>
          Очистити дані
        </button>
      </div>
    </section>
  );
}
