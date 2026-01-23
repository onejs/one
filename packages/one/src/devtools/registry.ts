/**
 * Simple registry for devtools functions.
 * This avoids circular dependencies by letting modules register their
 * devtools functions instead of router.ts importing them.
 */

type LoaderTimingEntry = {
  path: string
  startTime: number
  moduleLoadTime?: number
  executionTime?: number
  totalTime?: number
  error?: string
  source: 'preload' | 'initial' | 'refetch'
}

type DevtoolsRegistry = {
  getLoaderTimingHistory?: () => any[]
  recordLoaderTiming?: (entry: LoaderTimingEntry) => void
}

export const devtoolsRegistry: DevtoolsRegistry = {}

/**
 * Register a devtools function. Called by modules like useLoader.ts
 */
export function registerDevtoolsFunction<K extends keyof DevtoolsRegistry>(
  key: K,
  fn: DevtoolsRegistry[K]
) {
  devtoolsRegistry[key] = fn
}
