import { useRef } from 'react'
import { useRouter } from '../hooks'
import type { OneRouter } from '../interfaces/router'
import { useFocusEffect } from '../useFocusEffect'

// module-scoped guard shared across every <Redirect> instance, keyed by href.
//
// an auth-gate layout conditionally renders <Redirect> (logged-in) vs
// <Slot>/null (loading), so while auth state settles it mounts and unmounts
// Redirect repeatedly. each remount is a fresh instance with a fresh
// `hasRedirected` ref, and `router.replace` is async (it awaits route preload
// before it ever dispatches), so a per-instance ref can't stop the next remount
// from firing another concurrent replace into the same target during that await
// window. the pile of resetRoot dispatches then throws "Maximum update depth
// exceeded". this guard dedupes across instances; it's cleared once the
// navigation promise settles, so a later redirect to the same href still fires.
const redirectsInFlight = new Set<string>()

/** Redirects to the href as soon as the component is mounted. */

export function Redirect({ href }: { href: OneRouter.Href }) {
  const router = useRouter()
  const hasRedirected = useRef(false)

  useFocusEffect(() => {
    if (hasRedirected.current) return

    const key = typeof href === 'string' ? href : JSON.stringify(href)
    // a redirect to this href is already in flight from another (re)mount
    if (redirectsInFlight.has(key)) return

    hasRedirected.current = true
    redirectsInFlight.add(key)

    Promise.resolve(router.replace(href))
      .catch((error) => {
        // navigation failed, let a future mount retry
        hasRedirected.current = false
        console.error(error)
      })
      .finally(() => {
        redirectsInFlight.delete(key)
      })
  }, [href])

  return null
}
