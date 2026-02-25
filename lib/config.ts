import rawConfig from '../config.json';

export interface AppConfig {
  ingestion: {
    LOOKBACK_DAYS: number;
    TARGET_STATUSES: string[];
    TARGET_METHODS: string[];
    CONCURRENT_REQUESTS: number;
    REQUEST_DELAY_MS: number;
    BATCH_SIZE: number;
  };
  signals: {
    S1_VALUE_THRESHOLD: number;
    S2_DEADLINE_THRESHOLDS: Record<string, number>;
    S3_NEGOTIATION_THRESHOLD: number;
    S3_NEGOTIATION_METHODS: string[];
    S4_REPEAT_WIN_COUNT: number;
    S4_WINDOW_DAYS: number;
    S4_MIN_TOTAL_VALUE: number;
    S5_SIMILARITY_THRESHOLD: number;
    S5_REPOST_WINDOW_DAYS: number;
  };
  scoring: {
    MAX_SCORE: number;
    WEIGHTS: Record<string, number>;
    SEVERITY_BANDS: Record<string, [number, number]>;
  };
}

const config: AppConfig = rawConfig as unknown as AppConfig;

export default config;
