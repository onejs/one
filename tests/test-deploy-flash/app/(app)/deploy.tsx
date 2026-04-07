import { useEffect, useRef } from 'react'
import { useRouter } from 'one'

// mirrors soot's app/(app)/deploy.tsx — top-level /deploy redirect.
// waits for project gate, then redirects to /project/{id}/main/deploy.

export default function DeployRedirect() {
  const router = useRouter()
  const redirectedRef = useRef(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as any).__deployRouteMounted = true
      ;(window as any).__deployRouteMountLog = (
        (window as any).__deployRouteMountLog ?? []
      ).concat({ at: performance.now(), url: location.pathname })
    }

    const w = typeof window !== 'undefined' ? (window as any) : null
    if (!w) return
    if (redirectedRef.current) return
    if (!w.__testProjectResolved) return

    redirectedRef.current = true
    router.replace('/project/target/main/deploy')
  })

  return <div id="deploy-marker">DEPLOY</div>
}
