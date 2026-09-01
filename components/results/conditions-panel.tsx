import { type FormEvent, useState } from "react";
import type {
  CurrentWeather,
  ForecastHistory,
  WaterSettings,
} from "../../types/planner";
import { SmoothHeight } from "../smooth-height";

const WIND_NAMES = [
  "Пн",
  "Пн-Сх",
  "Сх",
  "Пд-Сх",
  "Пд",
  "Пд-Зх",
  "Зх",
  "Пн-Зх",
];

function waterSettingsEqual(first: WaterSettings, second: WaterSettings) {
  return (
    first.waterType === second.waterType &&
    first.clarity === second.clarity &&
    first.flow === second.flow &&
    first.waterTemperature === second.waterTemperature &&
    first.hasStructure === second.hasStructure
  );
}

function hasWaterData(water: WaterSettings) {
  return (
    water.waterType !== "unknown" ||
    water.clarity !== "unknown" ||
    water.flow !== "unknown" ||
    water.waterTemperature !== "" ||
    water.hasStructure
  );
}

type ConditionsPanelProps = {
  history: ForecastHistory;
  weather: CurrentWeather;
  water: WaterSettings;
  waterDetailsOpen: boolean;
  onApplyWater: (water: WaterSettings) => void;
  onToggleWaterDetails: () => void;
};

export function ConditionsPanel({
  history,
  weather,
  water,
  waterDetailsOpen,
  onApplyWater,
  onToggleWaterDetails,
}: ConditionsPanelProps) {
  const [draftWater, setDraftWater] = useState<WaterSettings>(water);
  const [didApply, setDidApply] = useState(false);
  const windDirection =
    WIND_NAMES[Math.round(weather.wind_direction_10m / 45) % 8];
  const hasChanges = !waterSettingsEqual(draftWater, water);
  const hasAppliedData = hasWaterData(water);

  function updateDraft<Key extends keyof WaterSettings>(
    key: Key,
    value: WaterSettings[Key],
  ) {
    setDraftWater((current) => ({ ...current, [key]: value }));
    setDidApply(false);
  }

  function applyWater(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasChanges) return;

    onApplyWater(draftWater);
    setDidApply(true);
  }

  const formStatus = hasChanges
    ? "Є незастосовані зміни"
    : didApply
      ? "Зміни застосовано до прогнозу"
      : hasAppliedData
        ? "Ці дані вже враховані у прогнозі"
        : "Заповніть хоча б одне поле, щоб уточнити прогноз";
  const applyLabel = hasChanges
    ? "Застосувати зміни"
    : didApply || hasAppliedData
      ? "Застосовано"
      : "Застосувати";

  return (
    <div
      className="tab-panel"
      role="tabpanel"
      id="panel-conditions"
      aria-labelledby="tab-conditions"
    >
      <div className="weather-grid">
        <article>
          <span>Температура</span>
          <b>{weather.temperature_2m.toFixed(1)}°C</b>
          <small>
            {history.temperatureTrend24h >= 0 ? "+" : ""}
            {history.temperatureTrend24h.toFixed(1)}° за 24 год
          </small>
        </article>
        <article>
          <span>Вітер</span>
          <b>{Math.round(weather.wind_speed_10m)} км/год</b>
          <small>
            {windDirection} · пориви {Math.round(weather.wind_gusts_10m)}
          </small>
        </article>
        <article>
          <span>Тиск</span>
          <b>{Math.round(weather.pressure_msl)} гПа</b>
          <small>
            {history.pressureTrend3h >= 0 ? "+" : ""}
            {history.pressureTrend3h.toFixed(1)} за 3 год
          </small>
        </article>
        <article>
          <span>Небо й опади</span>
          <b>{Math.round(weather.cloud_cover)}% хмар</b>
          <small>{history.precipitation24h.toFixed(1)} мм за 24 год</small>
        </article>
      </div>

      <button
        type="button"
        className="water-toggle"
        aria-expanded={waterDetailsOpen}
        aria-controls="water-details"
        onClick={onToggleWaterDetails}
      >
        <span>
          <b>Уточнити прогноз</b>
          <small>Додайте умови водойми — індекс стане точнішим</small>
        </span>
        <strong aria-hidden="true">{waterDetailsOpen ? "−" : "+"}</strong>
      </button>

      <SmoothHeight className="water-details-height">
        {waterDetailsOpen ? (
          <form className="water-form" id="water-details" onSubmit={applyWater}>
          <h3>Дані водойми</h3>
          <p>Ці параметри неможливо надійно визначити лише за містом.</p>
          <div className="form-grid">
            <label>
              Тип водойми
              <select
                value={draftWater.waterType}
                onChange={(event) =>
                  updateDraft(
                    "waterType",
                    event.target.value as WaterSettings["waterType"],
                  )
                }
              >
                <option value="unknown">Не знаю</option>
                <option value="river">Річка</option>
                <option value="lake">Озеро</option>
                <option value="reservoir">Водосховище</option>
                <option value="pond">Ставок</option>
              </select>
            </label>
            <label>
              Прозорість
              <select
                value={draftWater.clarity}
                onChange={(event) =>
                  updateDraft(
                    "clarity",
                    event.target.value as WaterSettings["clarity"],
                  )
                }
              >
                <option value="unknown">Не знаю</option>
                <option value="clear">Прозора</option>
                <option value="stained">Злегка мутна</option>
                <option value="murky">Мутна</option>
              </select>
            </label>
            <label>
              Течія
              <select
                value={draftWater.flow}
                onChange={(event) =>
                  updateDraft(
                    "flow",
                    event.target.value as WaterSettings["flow"],
                  )
                }
              >
                <option value="unknown">Не знаю</option>
                <option value="still">Немає</option>
                <option value="slow">Слабка</option>
                <option value="moderate">Помірна</option>
                <option value="fast">Сильна</option>
              </select>
            </label>
            <label>
              Температура води, °C
              <input
                type="number"
                min="0"
                max="35"
                step="0.5"
                value={draftWater.waterTemperature}
                onChange={(event) =>
                  updateDraft("waterTemperature", event.target.value)
                }
                placeholder="необов’язково"
              />
            </label>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={draftWater.hasStructure}
              onChange={(event) =>
                updateDraft("hasStructure", event.target.checked)
              }
            />
            Є трава, бровка, корчі або інше укриття
          </label>

          <div className="water-form-actions">
            <p
              className={hasChanges ? "water-form-status pending" : "water-form-status"}
              role="status"
              aria-live="polite"
            >
              {formStatus}
            </p>
            <button
              type="submit"
              className="water-apply"
              disabled={!hasChanges}
            >
              {applyLabel}
            </button>
          </div>
          </form>
        ) : null}
      </SmoothHeight>
    </div>
  );
}
