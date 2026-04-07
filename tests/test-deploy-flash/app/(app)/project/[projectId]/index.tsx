import { useEffect } from 'react'
import { useParams } from 'one'

export default function ProjectIndexRoute() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams()
      ;(window as any).__projectIndexMounted = true
    }
  }, [])

  return <div id="project-index-marker">PROJECT INDEX</div>
}
