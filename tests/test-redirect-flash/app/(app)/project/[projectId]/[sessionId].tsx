import { useEffect } from 'react'
import { useParams } from 'one'

// sibling to project/[projectId]/index.tsx — mirrors soot's structure.
// having multiple children under [projectId]/ means the nested navigator
// has more than one screen to pick from.

export default function SessionRoute() {
  const params = useParams<{ projectId: string; sessionId: string }>()
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as any).__sessionRouteMounted = true
    }
  }, [])
  return (
    <div
      id="session-marker"
      data-project-id={params.projectId}
      data-session-id={params.sessionId}
    >
      SESSION:{params.projectId}:{params.sessionId}
    </div>
  )
}
