import { router, useParams, usePathname } from 'one'
import { useEffect } from 'react'

type SessionRouteWindow = Window & {
  __sessionRouteMounted?: boolean
  __sessionRouteMountLog?: Array<{
    at: number
    url: string
    pathname: string
    params: { projectId?: string; sessionId?: string }
  }>
}

export default function SessionIndexRoute() {
  const params = useParams<{ projectId: string; sessionId: string }>()
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sessionWindow = window as SessionRouteWindow
      sessionWindow.__sessionRouteMounted = true
      sessionWindow.__sessionRouteMountLog = (
        sessionWindow.__sessionRouteMountLog ?? []
      ).concat({
        at: performance.now(),
        url: location.pathname,
        pathname,
        params: { ...params },
      })
    }
  }, [params, pathname])

  return (
    <div id="session-marker">
      <span id="session-page-pathname">{pathname}</span>
      <span id="session-project-id">{params.projectId}</span>
      <span id="session-id">{params.sessionId}</span>
      <button
        id="replace-session-project"
        type="button"
        onClick={() =>
          router.replace({
            pathname: '/project/[projectId]/[sessionId]',
            params: { projectId: 'proj_created', sessionId: 'main' },
          })
        }
      >
        replace project
      </button>
      <button
        id="replace-into-nested-group-project"
        type="button"
        onClick={() =>
          router.replace({
            pathname: '/nested-project/[projectId]/[sessionId]',
            params: { projectId: 'proj_nested_created', sessionId: 'main' },
          })
        }
      >
        replace nested project
      </button>
    </div>
  )
}
