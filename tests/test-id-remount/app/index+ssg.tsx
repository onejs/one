import { useEffect, useId, useState } from 'react'

let pageRenderCount = 0
const pageIds: string[] = []

export default function IndexPage() {
  const id = useId()
  // track if this is a fresh mount vs re-render
  const [mountTime] = useState(() => Date.now())
  pageRenderCount++

  if (!pageIds.includes(id)) {
    pageIds.push(id)
  }

  // THIS IS TESTED LEAVE IT
  console.info('page', id, 'mount:', mountTime, 'render:', pageRenderCount)

  useEffect(() => {
    window.__hydrationTest = window.__hydrationTest || ({} as any)
    window.__hydrationTest.page = {
      renders: pageRenderCount,
      ids: [...pageIds],
      current: id,
      effects: (window.__hydrationTest.page?.effects || 0) + 1,
    }
  }, [id])

  return (
    <div id="index-page" data-testid={id}>
      <h1>Index Page</h1>
    </div>
  )
}
