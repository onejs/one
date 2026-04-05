import { useEffect } from 'react'
import { useParams } from 'one'

// /nested/[id]/[sub] sibling leaf — must NOT mount when the URL is only
// /nested/foo. mirrors soot's project/[projectId]/[sessionId].tsx.
//
// the bug being guarded: the [id] navigator's late-mount resolver used to
// rank screens by matching them against the full browser path after a
// literal startsWith strip of the layout prefix. when the layout path is
// /nested/[id] (dynamic), the startsWith strip fails and [sub] — a single
// dynamic segment — scores higher than index (empty pattern) against the
// leftover /nested/foo. the navigator would then mount [sub], and React
// Navigation's linking integration would write the URL back with sub
// serialized as the string "undefined", landing on /nested/foo/undefined.
export default function NestedSubRoute() {
  const params = useParams<{ id: string; sub: string }>()
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as any).__nestedSubMounted = true
      ;(window as any).__nestedSubMountLog = (
        (window as any).__nestedSubMountLog ?? []
      ).concat({
        at: performance.now(),
        url: location.pathname,
        id: params.id,
        sub: params.sub,
      })
    }
  }, [])
  return (
    <div id="nested-sub-marker" data-id={params.id} data-sub={params.sub}>
      NESTED-SUB:{params.id}:{params.sub}
    </div>
  )
}
