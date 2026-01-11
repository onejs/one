/**
 * Register the current route as a scroll group.
 * Child routes will preserve scroll position when navigating between them.
 *
 * Use this in a layout component to create a scroll group for all its children.
 *
 * @example
 * ```tsx
 * // app/dashboard/_layout.tsx
 * import { useScrollGroup } from 'one'
 *
 * export default function DashboardLayout() {
 *   // All routes under /dashboard will share scroll position
 *   useScrollGroup()
 *
 *   return <Slot />
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Custom group path
 * useScrollGroup('/products')
 * ```
 */
export declare function useScrollGroup(groupPath?: string): void;
//# sourceMappingURL=useScrollGroup.d.ts.map