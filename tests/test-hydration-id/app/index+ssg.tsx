import { useEffect, useId } from 'react'

let pageRenderCount = 0
const pageIds: string[] = []

export default function IndexPage() {
  const id = useId()
  pageRenderCount++

  if (!pageIds.includes(id)) {
    pageIds.push(id)
  }

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
