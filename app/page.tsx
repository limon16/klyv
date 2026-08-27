"use client";

import { FormEvent, useMemo, useState } from "react";

type Forecast = {
  temperature_2m: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  wind_gusts_10m: number;
  pressure_msl: number;
  cloud_cover: number;
  precipitation: number;
};

function windName(degrees: number) {
  const directions = ["північний", "північно-східний", "східний", "південно-східний", "південний", "південно-західний", "західний", "північно-західний"];
  return directions[Math.round(degrees / 45) % 8];
}

export default function Home() {
  const [place, setPlace] = useState("Київ");
  const [latitude, setLatitude] = useState(50.4501);
  const [longitude, setLongitude] = useState(30.5234);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [previousPressure, setPreviousPressure] = useState<number | null>(null);
  const [locationName, setLocationName] = useState("Київ — орієнтовно");
  const [status, setStatus] = useState("Введіть місце і подивіться умови для щуки.");
  const [loading, setLoading] = useState(false);

  const score = useMemo(() => {
    if (!forecast) return null;
    let value = 54;
    if (forecast.wind_speed_10m >= 7 && forecast.wind_speed_10m <= 22) value += 12;
    else if (forecast.wind_speed_10m > 35) value -= 18;
    if (forecast.cloud_cover >= 45 && forecast.cloud_cover <= 90) value += 8;
    if (forecast.temperature_2m <= 18) value += 6;
    if (previousPressure !== null && Math.abs(forecast.pressure_msl - previousPressure) < 2) value += 7;
    if (previousPressure !== null && forecast.pressure_msl - previousPressure < -4) value -= 7;
    return Math.min(100, Math.max(0, Math.round(value)));
  }, [forecast, previousPressure]);

  async function loadForecast(lat = latitude, lon = longitude, name = locationName) {
    setLoading(true);
    setStatus("Оновлюю погодні дані…");
    try {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", String(lat));
      url.searchParams.set("longitude", String(lon));
      url.searchParams.set("current", "temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,cloud_cover,precipitation");
      url.searchParams.set("hourly", "pressure_msl");
      url.searchParams.set("past_hours", "3");
      url.searchParams.set("forecast_hours", "1");
      url.searchParams.set("timezone", "auto");
      const response = await fetch(url);
      if (!response.ok) throw new Error("weather");
      const data = await response.json();
      setForecast(data.current);
      setPreviousPressure(data.hourly?.pressure_msl?.[0] ?? null);
      setLocationName(name);
      setStatus("Дані оновлено. Це оцінка активності, а не гарантія улову.");
    } catch {
      setStatus("Не вдалося отримати погоду. Перевірте інтернет і спробуйте ще раз.");
    } finally {
      setLoading(false);
    }
  }

  async function searchCity(event: FormEvent) {
    event.preventDefault();
    if (!place.trim()) return;
    setLoading(true);
    setStatus("Шукаю місто…");
    try {
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=uk&name=${encodeURIComponent(place)}`);
      const data = await response.json();
      const result = data.results?.[0];
      if (!result) throw new Error("not found");
      setLatitude(result.latitude);
      setLongitude(result.longitude);
      await loadForecast(result.latitude, result.longitude, `${result.name}${result.admin1 ? `, ${result.admin1}` : ""} — орієнтовно`);
    } catch {
      setStatus("Місто не знайдено. Спробуйте назву українською або введіть координати.");
      setLoading(false);
    }
  }

  function useGps() {
    if (!navigator.geolocation) {
      setStatus("Ваш браузер не підтримує геолокацію. Введіть координати вручну.");
      return;
    }
    setStatus("Визначаю вашу точку…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lon } = position.coords;
        setLatitude(lat); setLongitude(lon);
        loadForecast(lat, lon, "Ваша GPS-точка — точний прогноз");
      },
      () => setStatus("Не отримано доступ до геолокації. Можна ввести координати з Compass вручну."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <main>
      <section className="hero">
        <div className="brand"><span>◒</span> ЩУКА</div>
        <p className="eyebrow">Розумний прогноз для риболовлі</p>
        <h1>Де сьогодні<br /><i>є рух.</i></h1>
        <p className="intro">Погода, вітер і тиск — з поясненням, що це може означати саме для щуки.</p>
      </section>

      <section className="panel">
        <div className="tabs"><span className="active">Локація</span><span>Умови</span><span>Поради</span></div>
        <form onSubmit={searchCity} className="search">
          <label htmlFor="place">Місто або найближчий населений пункт</label>
          <div><input id="place" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Напр. Канів" /><button disabled={loading}>Знайти</button></div>
          <small>Місто дає приблизну оцінку. Для водойми краще вказати точку.</small>
        </form>

        <button className="gps" onClick={useGps} type="button">⌖ Використати мою GPS-точку</button>
        <div className="coordinates">
          <div><label htmlFor="lat">Широта</label><input id="lat" inputMode="decimal" value={latitude} onChange={(e) => setLatitude(Number(e.target.value))} /></div>
          <div><label htmlFor="lon">Довгота</label><input id="lon" inputMode="decimal" value={longitude} onChange={(e) => setLongitude(Number(e.target.value))} /></div>
          <button type="button" className="outline" disabled={loading} onClick={() => loadForecast(latitude, longitude, "Координати Compass — точний прогноз")}>Розрахувати</button>
        </div>
        <p className="hint">На iPhone: Compass → натисніть координати → скопіюйте широту й довготу сюди.</p>
        <p className="status" aria-live="polite">{status}</p>
      </section>

      {forecast && score !== null && <section className="result">
        <div className="location">{locationName}</div>
        <div className="score"><div><strong>{score}</strong><span>/100</span></div><p>активність щуки<br /><b>{score >= 70 ? "добра" : score >= 50 ? "помірна" : "обережна"}</b></p></div>
        <div className="conditions">
          <article><span>ВІТЕР</span><b>{Math.round(forecast.wind_speed_10m)} км/год</b><p>{windName(forecast.wind_direction_10m)}, пориви {Math.round(forecast.wind_gusts_10m)}</p></article>
          <article><span>ТИСК</span><b>{Math.round(forecast.pressure_msl)} гПа</b><p>{previousPressure === null ? "немає тренду" : `${(forecast.pressure_msl - previousPressure).toFixed(1)} гПа за 3 год`}</p></article>
          <article><span>НЕБО</span><b>{Math.round(forecast.cloud_cover)}% хмар</b><p>{forecast.precipitation > 0 ? `опади ${forecast.precipitation} мм` : "без опадів"}</p></article>
        </div>
        <div className="advice"><b>На що звернути увагу</b><p>{forecast.wind_speed_10m >= 7 && forecast.wind_speed_10m <= 22 ? "Помірний вітер може зібрати кормову рибу до навітряного берега — почніть з цієї сторони водойми." : "Шукайте щуку вздовж трави, брівок і межі чистої та мутної води."} Найкраще сприймайте оцінку разом із власним журналом уловів.</p></div>
      </section>}
    </main>
  );
}
