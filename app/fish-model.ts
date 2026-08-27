export type SpeciesId = "pike" | "zander" | "perch" | "asp" | "catfish" | "carp" | "bream" | "crucian";
export type WaterType = "unknown" | "river" | "lake" | "reservoir" | "pond";
export type Clarity = "unknown" | "clear" | "stained" | "murky";
export type Flow = "unknown" | "still" | "slow" | "moderate" | "fast";

export type SpeciesProfile = {
  id: SpeciesId;
  name: string;
  group: "Хижа" | "Мирна";
  thermal: [number, number, number, number];
  light: "dusk" | "dark" | "day" | "warm";
  wind: [number, number];
  habitatWeight: number;
  tactic: string;
};

export const SPECIES: SpeciesProfile[] = [
  { id: "pike", name: "Щука", group: "Хижа", thermal: [3, 9, 17, 24], light: "dusk", wind: [7, 22], habitatWeight: 25, tactic: "Перевірте край трави, затоки й навітряний берег. Ведіть приманку повільніше у холодній воді." },
  { id: "zander", name: "Судак", group: "Хижа", thermal: [5, 12, 21, 27], light: "dark", wind: [4, 18], habitatWeight: 30, tactic: "Шукайте бровки, тверде дно та ями. Найцінніші вікна — сутінки й перші години темряви." },
  { id: "perch", name: "Окунь", group: "Хижа", thermal: [4, 11, 22, 28], light: "day", wind: [4, 18], habitatWeight: 35, tactic: "Перевірте перепади глибини, локальні укриття й скупчення малька; обловлюйте точку серіями." },
  { id: "asp", name: "Жерех", group: "Хижа", thermal: [8, 14, 24, 29], light: "day", wind: [2, 15], habitatWeight: 30, tactic: "Шукайте струмінь, перекати й виходи малька. Подача має бути далекою та швидкою." },
  { id: "catfish", name: "Сом", group: "Хижа", thermal: [10, 19, 28, 32], light: "dark", wind: [0, 14], habitatWeight: 35, tactic: "У теплій воді перевірте виходи з ям увечері та вночі; вдень тримайтеся глибини й укриттів." },
  { id: "carp", name: "Короп", group: "Мирна", thermal: [8, 18, 28, 32], light: "warm", wind: [3, 16], habitatWeight: 35, tactic: "У теплій стабільній воді почніть із мілкіших прогрітих зон; шукайте природний корм і тверді плями." },
  { id: "bream", name: "Лящ", group: "Мирна", thermal: [5, 14, 24, 29], light: "warm", wind: [2, 14], habitatWeight: 35, tactic: "Шукайте бровку поруч із глибиною та стабільну кормову точку; на течії контролюйте прикорм." },
  { id: "crucian", name: "Карась", group: "Мирна", thermal: [8, 16, 27, 32], light: "warm", wind: [1, 13], habitatWeight: 35, tactic: "У теплу погоду перевірте мілководдя біля рослинності; за похолодання зміщуйтеся трохи глибше." },
];

export type ModelInput = {
  airTemperature: number;
  waterTemperature?: number;
  windSpeed: number;
  windGusts: number;
  cloudCover: number;
  pressureTrend3h: number;
  temperatureTrend24h: number;
  precipitation24h: number;
  isDay: boolean;
  hour: number;
  month: number;
  waterType: WaterType;
  clarity: Clarity;
  flow: Flow;
  hasStructure: boolean;
};

export type ScoreResult = {
  score: number;
  confidence: number;
  parts: { label: string; value: number; note: string }[];
  drivers: { kind: "temperature" | "wind" | "pressure" | "water"; tone: "good" | "bad" | "neutral"; text: string }[];
  tactic: string;
};

const clamp = (value: number) => Math.max(0, Math.min(100, value));

function trapezoid(value: number, [min, idealMin, idealMax, max]: SpeciesProfile["thermal"]) {
  if (value <= min || value >= max) return 18;
  if (value >= idealMin && value <= idealMax) return 92;
  if (value < idealMin) return 18 + ((value - min) / (idealMin - min)) * 74;
  return 92 - ((value - idealMax) / (max - idealMax)) * 74;
}

function lightScore(profile: SpeciesProfile, input: ModelInput) {
  const twilight = input.hour <= 7 || input.hour >= 18;
  if (profile.light === "dark") return !input.isDay ? 92 : twilight || input.cloudCover > 75 ? 76 : 44;
  if (profile.light === "dusk") return twilight ? 92 : input.cloudCover > 55 ? 74 : 56;
  if (profile.light === "day") return input.isDay ? (input.cloudCover > 90 ? 62 : 82) : 44;
  return twilight ? 86 : input.isDay ? 72 : 52;
}

function windScore(profile: SpeciesProfile, input: ModelInput) {
  const [idealMin, idealMax] = profile.wind;
  if (input.windGusts > 42) return 20;
  if (input.windSpeed >= idealMin && input.windSpeed <= idealMax) return 88;
  if (input.windSpeed < idealMin) return 58;
  return clamp(88 - (input.windSpeed - idealMax) * 4);
}

function habitatScore(profile: SpeciesProfile, input: ModelInput) {
  if (input.waterType === "unknown" && input.clarity === "unknown" && input.flow === "unknown" && !input.hasStructure) return null;
  let value = 58;
  if (input.hasStructure) value += 14;
  if (["zander", "asp", "catfish", "bream"].includes(profile.id) && input.waterType === "river") value += 8;
  if (["pike", "perch", "carp", "crucian"].includes(profile.id) && ["lake", "pond", "reservoir"].includes(input.waterType)) value += 6;
  if (profile.id === "zander" && input.clarity !== "clear") value += 7;
  if (profile.id === "pike" && input.clarity === "stained") value += 5;
  if (profile.id === "asp" && ["moderate", "fast"].includes(input.flow)) value += 10;
  if (["carp", "crucian"].includes(profile.id) && input.flow === "still") value += 7;
  return clamp(value);
}

export function scoreSpecies(speciesId: SpeciesId, input: ModelInput): ScoreResult {
  const profile = SPECIES.find((item) => item.id === speciesId) ?? SPECIES[0];
  const temperature = input.waterTemperature ?? input.airTemperature;
  const thermal = trapezoid(temperature, profile.thermal);
  const light = lightScore(profile, input);
  const wind = windScore(profile, input);
  const stability = clamp(88 - Math.abs(input.pressureTrend3h) * 7 - Math.abs(input.temperatureTrend24h) * 2.5 - Math.max(0, input.precipitation24h - 8) * 2);
  const habitat = habitatScore(profile, input);
  const seasonal = profile.light === "warm" && [11, 12, 1, 2].includes(input.month) ? 38 : 76;
  const weights = { thermal: 25, light: 20, wind: 12, stability: 13, seasonal: 10, habitat: profile.habitatWeight };
  const values: [number, number][] = [[thermal, weights.thermal], [light, weights.light], [wind, weights.wind], [stability, weights.stability], [seasonal, weights.seasonal]];
  if (habitat !== null) values.push([habitat, weights.habitat]);
  const score = Math.round(values.reduce((sum, [value, weight]) => sum + value * weight, 0) / values.reduce((sum, [, weight]) => sum + weight, 0));
  let confidence = input.waterTemperature !== undefined ? 60 : 44;
  if (input.waterType !== "unknown") confidence += 9;
  if (input.clarity !== "unknown") confidence += 7;
  if (input.flow !== "unknown") confidence += 7;
  if (input.hasStructure) confidence += 5;

  const drivers: ScoreResult["drivers"] = [];
  drivers.push({ kind: "temperature", tone: thermal >= 70 ? "good" : thermal < 45 ? "bad" : "neutral", text: `${input.waterTemperature === undefined ? "Температура повітря як приблизний показник" : "Температура води"}: ${temperature.toFixed(1)}°C` });
  drivers.push({ kind: "wind", tone: wind >= 70 ? "good" : wind < 40 ? "bad" : "neutral", text: `Вітер ${Math.round(input.windSpeed)} км/год, пориви до ${Math.round(input.windGusts)}` });
  drivers.push({ kind: "pressure", tone: stability >= 70 ? "good" : stability < 45 ? "bad" : "neutral", text: `Тиск ${input.pressureTrend3h >= 0 ? "+" : ""}${input.pressureTrend3h.toFixed(1)} гПа за 3 год` });
  if (habitat === null) drivers.push({ kind: "water", tone: "neutral", text: "Дані про водойму не задані — упевненість нижча" });

  return {
    score,
    confidence: clamp(confidence),
    parts: [
      { label: "Температура", value: Math.round(thermal), note: input.waterTemperature === undefined ? "за повітрям, приблизно" : "за водою" },
      { label: "Час і світло", value: Math.round(light), note: input.isDay ? "денне вікно" : "темне вікно" },
      { label: "Вітер", value: Math.round(wind), note: "швидкість і пориви" },
      { label: "Стабільність", value: Math.round(stability), note: "тиск, t° та опади" },
      { label: "Водойма", value: habitat === null ? 0 : Math.round(habitat), note: habitat === null ? "не задано" : "за вашими даними" },
    ],
    drivers,
    tactic: profile.tactic,
  };
}
