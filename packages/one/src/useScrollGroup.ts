import { useEffect } from 'react'
import { usePathname } from './hooks'
import { registerScrollGroup } from './views/ScrollBehavior'

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
