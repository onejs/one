import { useEffect } from 'react'
import { usePathname } from './hooks'
import { registerScrollGroup } from './views/ScrollBehavior'

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
export function useScrollGroup(groupPath?: string) {
  const pathname = usePathname()

  useEffect(() => {
    // Use provided groupPath or derive from current pathname
    const group = groupPath || pathname

    if (!group) return

    // Normalize the group path
    const normalizedGroup = group.endsWith('/') ? group.slice(0, -1) : group

    return registerScrollGroup(normalizedGroup)
  }, [groupPath, pathname])
}
