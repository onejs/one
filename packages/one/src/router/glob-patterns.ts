export const ROUTE_GLOB_PATTERN = "**/*.{ts,tsx}";
export const API_ROUTE_GLOB_PATTERN = "**/*+api.{ts,tsx}";

/**
 * Glob patterns that will definitely be excluded from web that we can ignore as early as possible.
 */
export const ROUTE_WEB_EXCLUSION_GLOB_PATTERNS = [
  "**/*.native.{ts,tsx}",
  "**/*.ios.{ts,tsx}",
  "**/*.android.{ts,tsx}",
];

/**
 * Glob patterns that will definitely be excluded from native that we can ignore as early as possible.
 */
export const ROUTE_NATIVE_EXCLUSION_GLOB_PATTERNS = ["**/*.web.{ts,tsx}"];
