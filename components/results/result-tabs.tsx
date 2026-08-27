import type { KeyboardEvent } from "react";
import type { ResultTab } from "../../types/planner";

const RESULT_TABS: ResultTab[] = ["forecast", "conditions", "advice"];
const TAB_LABELS: Record<ResultTab, string> = {
  forecast: "Прогноз",
  conditions: "Умови",
  advice: "Поради",
};

type ResultTabsProps = {
  activeTab: ResultTab;
  onChange: (tab: ResultTab) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
};

export function ResultTabs({
  activeTab,
  onChange,
  onKeyDown,
}: ResultTabsProps) {
  return (
    <div className="tabs" role="tablist" aria-label="Результати прогнозу">
      {RESULT_TABS.map((item) => (
        <button
          key={item}
          id={`tab-${item}`}
          role="tab"
          tabIndex={activeTab === item ? 0 : -1}
          aria-selected={activeTab === item}
          aria-controls={`panel-${item}`}
          onKeyDown={onKeyDown}
          onClick={() => onChange(item)}
        >
          {TAB_LABELS[item]}
        </button>
      ))}
    </div>
  );
}
