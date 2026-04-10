/**
 * Safe utility to access environment variables in the webview.
 * Replaces direct process.env access to prevent ReferenceErrors if process is not defined.
 */

interface Env {
  NODE_ENV: string;
  IS_DEV: boolean;
  CLINE_ENVIRONMENT: string;
  IS_TEST: boolean;
  CI: boolean;
  TELEMETRY_SERVICE_API_KEY?: string;
  ERROR_SERVICE_API_KEY?: string;
}

// Safely get process.env
// Note: Vite's 'define' should replace 'process.env' with a literal value,
// but we add safety checks here just in case of dynamic access or build issues.
const getProcessEnv = (): any => {
  try {
    return typeof process !== "undefined" && process.env ? process.env : {};
  } catch {
    return {};
  }
};

const _env = getProcessEnv();

export enum Environment {
  production = "production",
  staging = "staging",
  local = "local",
  selfHosted = "selfHosted",
}

export const ENV: Env = {
  NODE_ENV: _env.NODE_ENV || "production",
  IS_DEV: String(_env.IS_DEV) === "true",
  CLINE_ENVIRONMENT: (_env.CLINE_ENVIRONMENT || "production") as Environment,
  IS_TEST: String(_env.IS_TEST) === "true",
  CI: String(_env.CI) === "true",
  TELEMETRY_SERVICE_API_KEY: _env.TELEMETRY_SERVICE_API_KEY,
  ERROR_SERVICE_API_KEY: _env.ERROR_SERVICE_API_KEY,
};

/**
 * Gets the API base URL for the current environment.
 * Replaces the Node.js dependent ClineEnv logic.
 */
export const getApiBaseUrl = (): string => {
  switch (ENV.CLINE_ENVIRONMENT) {
    case Environment.staging:
      return "https://core-api.staging.int.cline.bot";
    case Environment.local:
      return "http://localhost:7777";
    default:
      return "https://api.cline.bot";
  }
};

/**
 * Gets an environment variable by key with a fallback value.
 */
export const getEnvVar = (key: string, fallback = ""): string => {
  return _env[key] || fallback;
};

/**
 * Returns true if the app is running in development mode.
 */
export const isDev = (): boolean => ENV.IS_DEV;

/**
 * Returns true if the app is running in a test environment.
 */
export const isTest = (): boolean => ENV.IS_TEST;
