import { useEffect } from 'react'

export default function SessionIndexRoute() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as any).__sessionRouteMounted = true
      ;(window as any).__sessionRouteMountLog = (
        (window as any).__sessionRouteMountLog ?? []
      ).concat({ at: performance.now(), url: location.pathname })
    }
  }, [])

  return <div id="session-marker">SESSION</div>
}
