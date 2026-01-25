import { useEffect, useId } from 'react'
import { Slot } from 'one'

let nestedRenderCount = 0
const nestedIds: string[] = []

export default function NestedLayout() {
  const id = useId()
  nestedRenderCount++

  if (!nestedIds.includes(id)) {
    nestedIds.push(id)
  }

  useEffect(() => {
    window.__hydrationTest = window.__hydrationTest || ({} as any)
    window.__hydrationTest.nested = {
      renders: nestedRenderCount,
      ids: [...nestedIds],
      current: id,
      effects: (window.__hydrationTest.nested?.effects || 0) + 1,
    }
  }, [id])

  return (
    <div id="nested-layout" data-testid={id}>
      <Slot />
    </div>
  )
}
