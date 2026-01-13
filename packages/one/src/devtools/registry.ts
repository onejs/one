/**
 * Simple registry for devtools functions.
 * This avoids circular dependencies by letting modules register their
 * devtools functions instead of router.ts importing them.
 */

type DevtoolsRegistry = {
  getLoaderTimingHistory?: () => any[]
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
