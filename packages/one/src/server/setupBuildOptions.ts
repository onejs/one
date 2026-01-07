import type { One } from "../vite/types";

export function setupBuildInfo(buildInfo: One.BuildInfo) {
  // ensure cache key matches build
  process.env.ONE_CACHE_KEY ||= buildInfo.constants.CACHE_KEY;
  process.env.ONE_DEFAULT_RENDER_MODE ||= buildInfo.oneOptions?.web?.defaultRenderMode || "ssg";
}
