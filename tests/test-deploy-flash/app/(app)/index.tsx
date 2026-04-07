import { useEffect, useRef } from 'react'
import { useRouter } from 'one'

// mirrors soot's app/(app)/index.tsx — redirect route that waits for
// async state, then calls router.replace to the active project.

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

    const w = typeof window !== 'undefined' ? (window as any) : null
    if (!w) return
    if (w.__testSuppressHomeRedirect) return
    if (redirectedRef.current) return
    if (!w.__testUserReady) return
    if (!w.__testProjectResolved) return
    if (!['/', ''].includes(window.location.pathname)) return

    redirectedRef.current = true
    ;(window as any).__redirectFired = {
      at: performance.now(),
      fromUrl: location.pathname,
      toUrl: '/project/target/main',
    }
    router.replace('/project/target/main')
  })

  return <div id="home-marker">HOME</div>
}
