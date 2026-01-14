/**
 * Register a route as a scroll group. Routes within the same scroll group
 * preserve their scroll position when navigating between them.
 *
 * @param groupPath - Optional path to define the group. Defaults to current pathname.
 * @link https://onestack.dev/docs/api/hooks/useScrollGroup
 *
 * @example
 * ```tsx
 * // app/dashboard/_layout.tsx
 * export default function DashboardLayout() {
 *   useScrollGroup() // All /dashboard/* routes share scroll
 *   return <Slot />
 * }
 * ```
 */
export declare function useScrollGroup(groupPath?: string): void;
//# sourceMappingURL=useScrollGroup.d.ts.map