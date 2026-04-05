import { useEffect, useRef } from 'react'
import { useRouter } from 'one'

// mirrors soot's app/(app)/index.tsx — this route is a REDIRECT route that
// waits for some async state (in soot: auth + zero sync resolving active
// project), then calls router.replace(`/project/${id}`).
//
// the critical detail: there's a window.location.pathname guard that should
// prevent the redirect when we're not actually on /. but if something in the
// tree causes the navigator to re-initialize during hydration and React
// Navigation's linking integration briefly syncs the URL to /, the guard
// reads pathname === '/' at exactly the wrong moment and the redirect fires
// anyway — producing the /project/foo → / → /project/target bounce the user
// observed.
//
// we track both mount and redirect-fire so the test can detect either signal.

export default function HomeRoute() {
  const router = useRouter()
  const redirectedRef = useRef(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as any).__homeRouteMounted = true
      ;(window as any).__homeRouteMountLog = (
        (window as any).__homeRouteMountLog ?? []
      ).concat({ at: performance.now(), url: location.pathname })
    }

    // simulate soot's HomePage redirect gate:
    // wait for a "user" flag and a "resolved" flag, both of which are set
    // asynchronously to mimic Zero/auth resolution timing.
    const w = typeof window !== 'undefined' ? (window as any) : null
    if (!w) return
    if (w.__testSuppressHomeRedirect) return
    if (redirectedRef.current) return
    if (!w.__testUserReady) return
    if (!w.__testProjectResolved) return
    // soot's guard: only redirect when the browser URL is actually /
    if (!['/', ''].includes(window.location.pathname)) return

    redirectedRef.current = true
    ;(window as any).__redirectFired = {
      at: performance.now(),
      fromUrl: location.pathname,
      toUrl: '/project/target',
    }
    router.replace('/project/target')
  })

  return <div id="home-marker">HOME</div>
}
