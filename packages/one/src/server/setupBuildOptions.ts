import { setCacheKey } from '../constants'
import type { One } from '../vite/types'

export function setupBuildInfo(buildInfo: One.BuildInfo) {
  // ensure cache key matches build. env var is for child workers spawned later;
  // setCacheKey rebinds the in-memory postfixes for the current process so any
  // code that imported constants before setupBuildInfo ran (e.g. workerHandler
  // pulled in by serve-worker's static import graph) sees the pinned value.
  // headless-server may not pass `constants` — skip gracefully.
  const key = buildInfo.constants?.CACHE_KEY
  if (key) {
    process.env.ONE_CACHE_KEY ||= key
    setCacheKey(key)
  }
  process.env.ONE_DEFAULT_RENDER_MODE ||=
    buildInfo.oneOptions?.web?.defaultRenderMode || 'ssg'
}
