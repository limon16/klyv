import type { ScoreResult } from "../../lib/fish-model";

function scoreLabel(score: number) {
  if (score >= 76) return "Дуже сприятливі";
  if (score >= 61) return "Сприятливі";
  if (score >= 45) return "Змішані";
  return "Складні";
}

function confidenceLabel(value: number) {
  if (value >= 72) return "вища";
  if (value >= 55) return "середня";
  return "базова";
}

type ResultHeaderProps = {
  dayTitle: string;
  score: ScoreResult;
  speciesName: string;
};

export function ResultHeader({
  dayTitle,
  score,
  speciesName,
}: ResultHeaderProps) {
  return (
    <div className="result-head">
      <div className="result-kicker">
        <b>{speciesName}</b>
        <span>{dayTitle.toLowerCase()}</span>
      </div>
      <div className="result-summary">
        <div className="score-line">
          <strong>{score.score}</strong>
          <span>/100</span>
        </div>
        <div className="result-copy">
          <h2>{scoreLabel(score.score)} умови</h2>
          <p>
            <span>Упевненість</span>
            <b>{confidenceLabel(score.confidence)}</b>
            <i>·</i>
            <span>{score.confidence}% даних</span>
          </p>
        </div>
      </div>
    </div>
  );
}
