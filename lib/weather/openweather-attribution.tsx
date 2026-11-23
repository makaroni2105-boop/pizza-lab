import {
  OPENWEATHER_ATTRIBUTION_URL,
  OPENWEATHER_LOGO_URL,
} from "./weather-constants";

import styles from "./openweather-attribution.module.css";

/**
 * OpenWeather 出典表示（利用規約準拠 — 公式リンク・ロゴ）。
 */
export function OpenWeatherAttribution({ compact }: { compact?: boolean }) {
  return (
    <p className={compact ? styles.compact : styles.block} data-testid="openweather-attribution">
      <a
        href={OPENWEATHER_ATTRIBUTION_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.link}
      >
        {/* 公式 CDN ロゴ — API キーは含まない */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={OPENWEATHER_LOGO_URL}
          alt="OpenWeather"
          width={140}
          height={16}
          className={styles.logo}
        />
      </a>
      {!compact ? (
        <span className={styles.text}>
          外気温データの提供元:{" "}
          <a href={OPENWEATHER_ATTRIBUTION_URL} target="_blank" rel="noopener noreferrer">
            OpenWeather
          </a>
        </span>
      ) : null}
    </p>
  );
}