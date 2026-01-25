import { useEffect, useId, useState } from 'react'
import { Slot } from 'one'

// module-level tracking - persists across renders within a session
let rootRenderCount = 0
const rootIds: string[] = []

declare global {
  interface Window {
    __hydrationTest: {
      root: { renders: number; ids: string[]; current: string; effects: number }
      nested?: { renders: number; ids: string[]; current: string; effects: number }
      page?: { renders: number; ids: string[]; current: string; effects: number }
    }
  }
}

export default function RootLayout() {
  const id = useId()
  const [mountTime] = useState(() => Date.now())

  rootRenderCount++

  if (!rootIds.includes(id)) {
    rootIds.push(id)
  }

  console.log('root', id, 'mount:', mountTime, 'render:', rootRenderCount)

  useEffect(() => {
    window.__hydrationTest = window.__hydrationTest || ({} as any)
    window.__hydrationTest.root = {
      renders: rootRenderCount,
      ids: [...rootIds],
      current: id,
      effects: (window.__hydrationTest.root?.effects || 0) + 1,
    }
  }, [id])

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>Hydration Test</title>
      </head>
      <body>
        <div id="root" data-testid={id}>
          <Slot />
        </div>
      </body>
    </html>
  )
}
