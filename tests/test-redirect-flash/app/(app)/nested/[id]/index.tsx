import { useEffect } from 'react'
import { useParams } from 'one'

// /nested/[id] index leaf — the route that SHOULD mount on initial load
// of /nested/foo. mirrors soot's project/[projectId]/index.tsx.
export default function NestedIndexRoute() {
  const params = useParams<{ id: string }>()
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as any).__nestedIndexMounted = true
      ;(window as any).__nestedIndexMountLog = (
        (window as any).__nestedIndexMountLog ?? []
      ).concat({ at: performance.now(), url: location.pathname, id: params.id })
    }
  }, [])
  return (
    <div id="nested-index-marker" data-id={params.id}>
      NESTED-INDEX:{params.id}
    </div>
  )
}
