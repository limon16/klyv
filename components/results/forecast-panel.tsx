import {
  AlertTriangle,
  Check,
  Gauge,
  Info,
  Thermometer,
  Waves,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { ScoreResult } from "../../lib/fish-model";
import type { BestWindow } from "../../types/planner";

const DRIVER_ICONS: Record<ScoreResult["drivers"][number]["kind"], LucideIcon> =
  {
    temperature: Thermometer,
    wind: Wind,
    pressure: Gauge,
    water: Waves,
  };
const TONE_ICONS: Record<ScoreResult["drivers"][number]["tone"], LucideIcon> = {
  good: Check,
  bad: AlertTriangle,
  neutral: Info,
};

type ForecastPanelProps = {
  dayOffset: number;
  windows: BestWindow[];
  score: ScoreResult;
};

export function ForecastPanel({
  dayOffset,
  windows,
  score,
}: ForecastPanelProps) {
  return (
    <div
      className="tab-panel"
      role="tabpanel"
      id="panel-forecast"
      aria-labelledby="tab-forecast"
    >
      <h3>
        {dayOffset === 0
          ? "Найкращий час у наступні 12 годин"
          : "Найкращий час обраного дня"}
      </h3>
      <div className="windows">
        {windows.map((window) => (
          <div key={window.time}>
            <b>{window.time}</b>
            <span>
              {window.value}/100 ·{" "}
              {window.hours === 1 ? "1 година" : `${window.hours} год`}
            </span>
          </div>
        ))}
      </div>

      <h3>Що вплинуло</h3>
      <div className="drivers">
        {score.drivers.map((driver) => {
          const DriverIcon = DRIVER_ICONS[driver.kind];
          const ToneIcon = TONE_ICONS[driver.tone];
          return (
            <div key={driver.text} className={driver.tone}>
              <span className="driver-icon">
                <DriverIcon size={17} strokeWidth={2} aria-hidden="true" />
              </span>
              <p>{driver.text}</p>
              <span className="driver-tone">
                <ToneIcon size={13} strokeWidth={2.5} aria-hidden="true" />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
