import type { FishingPlanner } from "../hooks/use-fishing-planner";
import { SPECIES } from "../lib/fish-model";
import { AdvicePanel } from "./results/advice-panel";
import { ConditionsPanel } from "./results/conditions-panel";
import { ForecastPanel } from "./results/forecast-panel";
import { ResultHeader } from "./results/result-header";
import { ResultTabs } from "./results/result-tabs";
import { SmoothHeight } from "./smooth-height";

type ResultCardProps = {
  planner: FishingPlanner;
};

export function ResultCard({ planner }: ResultCardProps) {
  const { history, score, selectedWeather } = planner.view;
  if (!planner.forecast || !score || !history || !selectedWeather) return null;

  const speciesName =
    SPECIES.find((item) => item.id === planner.species)?.name ?? "Щука";
  const dayTitle =
    planner.view.dateChoices[planner.dayOffset]?.title ?? "Сьогодні";

  return (
    <section className="result-card">
      <ResultHeader
        dayTitle={dayTitle}
        score={score}
        speciesName={speciesName}
      />
      <ResultTabs
        activeTab={planner.tab}
        onChange={planner.setTab}
        onKeyDown={planner.handleTabKey}
      />

      <SmoothHeight className="result-panel-height">
        {planner.tab === "forecast" ? (
          <ForecastPanel
            dayOffset={planner.dayOffset}
            windows={planner.view.bestWindows}
            score={score}
          />
        ) : null}

        {planner.tab === "conditions" ? (
          <ConditionsPanel
            history={history}
            weather={selectedWeather}
            water={planner.water}
            waterDetailsOpen={planner.waterDetailsOpen}
            onApplyWater={planner.applyWaterSettings}
            onToggleWaterDetails={() =>
              planner.setWaterDetailsOpen((value) => !value)
            }
          />
        ) : null}

        {planner.tab === "advice" ? (
          <AdvicePanel score={score} speciesName={speciesName} />
        ) : null}
      </SmoothHeight>
    </section>
  );
}
