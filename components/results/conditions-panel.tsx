import type { FishingPlanner } from "../../hooks/use-fishing-planner";
import type { Clarity, Flow, WaterType } from "../../lib/fish-model";
import type { CurrentWeather, ForecastHistory } from "../../types/planner";

const WIND_NAMES = ["Пн", "Пн-Сх", "Сх", "Пд-Сх", "Пд", "Пд-Зх", "Зх", "Пн-Зх"];

type ConditionsPanelProps = {
  history: ForecastHistory;
  weather: CurrentWeather;
  water: FishingPlanner["water"];
  waterDetailsOpen: boolean;
  onClarityChange: (value: Clarity) => void;
  onFlowChange: (value: Flow) => void;
  onHasStructureChange: (value: boolean) => void;
  onToggleWaterDetails: () => void;
  onWaterTemperatureChange: (value: string) => void;
  onWaterTypeChange: (value: WaterType) => void;
};

export function ConditionsPanel({
  history,
  weather,
  water,
  waterDetailsOpen,
  onClarityChange,
  onFlowChange,
  onHasStructureChange,
  onToggleWaterDetails,
  onWaterTemperatureChange,
  onWaterTypeChange,
}: ConditionsPanelProps) {
  const windDirection =
    WIND_NAMES[Math.round(weather.wind_direction_10m / 45) % 8];

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

      {waterDetailsOpen ? (
        <div className="water-form" id="water-details">
          <h3>Дані водойми</h3>
          <p>Ці параметри неможливо надійно визначити лише за містом.</p>
          <div className="form-grid">
            <label>
              Тип водойми
              <select
                value={water.waterType}
                onChange={(event) =>
                  onWaterTypeChange(event.target.value as WaterType)
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
                value={water.clarity}
                onChange={(event) =>
                  onClarityChange(event.target.value as Clarity)
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
                value={water.flow}
                onChange={(event) => onFlowChange(event.target.value as Flow)}
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
                value={water.waterTemperature}
                onChange={(event) =>
                  onWaterTemperatureChange(event.target.value)
                }
                placeholder="необов’язково"
              />
            </label>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={water.hasStructure}
              onChange={(event) => onHasStructureChange(event.target.checked)}
            />
            Є трава, бровка, корчі або інше укриття
          </label>
        </div>
      ) : null}
    </div>
  );
}
