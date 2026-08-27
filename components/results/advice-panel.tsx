import type { ScoreResult } from "../../lib/fish-model";

type AdvicePanelProps = {
  score: ScoreResult;
  speciesName: string;
};

export function AdvicePanel({ score, speciesName }: AdvicePanelProps) {
  return (
    <div
      className="tab-panel"
      role="tabpanel"
      id="panel-advice"
      aria-labelledby="tab-advice"
    >
      <div className="tactic">
        <span>Тактика для виду</span>
        <h3>{speciesName}</h3>
        <p>{score.tactic}</p>
      </div>
      <h3>Складові індексу</h3>
      <div className="breakdown">
        {score.parts.map((part) => (
          <div key={part.label}>
            <div>
              <b>{part.label}</b>
              <small>{part.note}</small>
            </div>
            <div className="bar">
              <span style={{ width: `${part.value}%` }} />
            </div>
            <strong>{part.value || "—"}</strong>
          </div>
        ))}
      </div>
      <p className="disclaimer">
        Це погодний індекс, а не ймовірність улову. Реальний результат залежить
        від водойми, рибальського тиску, снасті та техніки. Перевіряйте місцеві
        правила й обмеження.
      </p>
    </div>
  );
}
