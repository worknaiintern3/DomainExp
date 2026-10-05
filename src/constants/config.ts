export const API_CONFIG = {
  // Expo allows EXPO_PUBLIC_ prefix for client-accessible env variables
  DEFAULT_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.58:4000/api/v1',
  FALLBACK_LOCALHOST: 'http://localhost:4000/api/v1',
  TIMEOUT_MS: 4000,
  APP_NAME: 'DomainPulse',
  VERSION: '1.0.0',
  RATE_LIMIT: {
    MAX_REQUESTS: 5000,
    WINDOW_MINUTES: 15,
    WINDOW_MS: 15 * 60 * 1000, // 900,000 ms (15 minutes)
  },
};

export const SUPPORTED_TLDS = [
  '.com',
  '.in',
  '.co.in',
  '.ai',
  '.io',
  '.org',
  '.net',
  '.co',
  '.tech',
  '.app',
  '.dev',
  '.xyz',
] as const;

export type SupportedTld = (typeof SUPPORTED_TLDS)[number];
