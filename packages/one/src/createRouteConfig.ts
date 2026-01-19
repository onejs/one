import type { One } from './interfaces/router'

/**
 * Helper to create a typed route configuration object.
 *
 * Use this to configure route-specific behavior like loading mode and sitemap settings.
 *
 * @example
 * ```tsx
 * // blocking mode - wait for loader before navigation
 * export const config = createRouteConfig({
 *   loading: 'blocking',
 * })
 *
 * // instant mode - navigate immediately, show Loading component
 * export const config = createRouteConfig({
 *   loading: 'instant',
 * })
 *
 * // timed mode - wait 200ms, then show Loading if still loading
 * export const config = createRouteConfig({
 *   loading: 200,
 * })
 *
 * // with sitemap config
 * export const config = createRouteConfig({
 *   loading: 'blocking',
 *   sitemap: {
 *     priority: 0.8,
 *     changefreq: 'weekly',
 *   },
 * })
 * ```
 */
export function createRouteConfig(config: One.RouteConfig): One.RouteConfig {
  return config
}
