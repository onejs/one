import type { ResolvedConfig } from "vite";

export type ConfigSubset = Pick<ResolvedConfig, "base" | "server" | "define" | "mode">;

/**
 * Can be serialized across process:
 */

let config: ConfigSubset | null;

export function setResolvedConfig(_: ConfigSubset) {
  config = JSON.parse(JSON.stringify(_));
}

export function getResolvedConfig() {
  if (!config) {
    throw new Error(`Must call setConfig first`);
  }
  return config;
}
