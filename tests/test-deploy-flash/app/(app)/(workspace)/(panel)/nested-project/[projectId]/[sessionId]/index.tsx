import { router, useParams, usePathname } from 'one'
import { useEffect } from 'react'

type NestedGroupRouteWindow = Window & {
  __nestedGroupRouteMounted?: boolean
  __nestedGroupRouteMountLog?: Array<{
    at: number
    url: string
    pathname: string
    params: { projectId?: string; sessionId?: string }
  }>
}

export default function NestedGroupSessionRoute() {
  const params = useParams<{ projectId: string; sessionId: string }>()
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const nestedWindow = window as NestedGroupRouteWindow
      nestedWindow.__nestedGroupRouteMounted = true
      nestedWindow.__nestedGroupRouteMountLog = (
        nestedWindow.__nestedGroupRouteMountLog ?? []
      ).concat({
        at: performance.now(),
        url: location.pathname,
        pathname,
        params: { ...params },
      })
    }
  }, [params, pathname])

  return (
    <div id="nested-group-session-marker">
      <span id="nested-group-page-pathname">{pathname}</span>
      <span id="nested-group-project-id">{params.projectId}</span>
      <span id="nested-group-session-id">{params.sessionId}</span>
      <button
        id="replace-nested-group-project"
        type="button"
        onClick={() =>
          router.replace({
            pathname: '/nested-project/[projectId]/[sessionId]',
            params: { projectId: 'proj_nested_replaced', sessionId: 'main' },
          })
        }
      >
        replace nested project
      </button>
    </div>
  )
}
