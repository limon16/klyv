export function SiteIntro() {
  return (
    <section className="hero">
      <p className="eyebrow">Погодні умови для риболовлі</p>
      <h1>
        Прогноз для <i>вашої точки.</i>
      </h1>
      <p>Оберіть місце й рибу — решту пояснимо простими словами.</p>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <span>
        Погода й геокодування:{" "}
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
          Open‑Meteo
        </a>
      </span>
      <span>Водні дані не вигадуємо — їх додає рибалка.</span>
    </footer>
  );
}
