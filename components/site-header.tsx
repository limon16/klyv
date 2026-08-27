import { MapPin, Pencil } from "lucide-react";
import type { RefObject } from "react";
import type { LocationSuggestion } from "../types/planner";

type SiteHeaderProps = {
  activeLocation: LocationSuggestion | null;
  activeLocationLabel: string;
  editorOpen: boolean;
  locationButton: RefObject<HTMLButtonElement | null>;
  onRefresh: () => void;
  onToggleLocation: () => void;
};

export function SiteHeader({
  activeLocation,
  activeLocationLabel,
  editorOpen,
  locationButton,
  onRefresh,
  onToggleLocation,
}: SiteHeaderProps) {
  return (
    <header className="topbar">
      <button
        className="brand"
        type="button"
        aria-label="Оновити сторінку й прогноз"
        onClick={onRefresh}
      >
        <span className="logo-mark" aria-hidden="true">
          ◒
        </span>
        <span className="brand-copy">
          <b>КЛЬОВ</b>
          <small>Планувальник риболовлі</small>
        </span>
      </button>

      <button
        ref={locationButton}
        className="header-location"
        type="button"
        aria-expanded={editorOpen}
        aria-controls="location-editor"
        aria-label={
          activeLocation
            ? `Змінити локацію: ${activeLocationLabel}`
            : "Вказати локацію"
        }
        onClick={onToggleLocation}
      >
        <MapPin size={16} aria-hidden="true" />
        <span>
          <b>{activeLocation ? activeLocation.name : "Вказати локацію"}</b>
        </span>
        <Pencil size={14} aria-hidden="true" />
      </button>
    </header>
  );
}
