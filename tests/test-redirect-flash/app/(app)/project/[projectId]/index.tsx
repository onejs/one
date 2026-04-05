import { useEffect } from 'react'
import { useParams } from 'one'

// deep dynamic route — NO intermediate _layout.tsx at project/ or project/[projectId]/.
// with no intermediate layouts, one hoists this route into (app)/_layout.tsx's
// navigator. on initial load of /project/foo, the navigator may pick the first
// child (index) before settling here, causing HomeRoute to briefly mount.

export default function ProjectRoute() {
  const params = useParams<{ projectId: string }>()
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as any).__projectRouteMounted = true
      ;(window as any).__projectRouteMountLog = (
        (window as any).__projectRouteMountLog ?? []
      ).concat({
        at: performance.now(),
        url: location.pathname,
        projectId: params.projectId,
      })
    }
  }, [])
  return (
    <div id="project-marker" data-project-id={params.projectId}>
      PROJECT:{params.projectId}
    </div>
  )
}
