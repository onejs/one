import { Suspense, useEffect, useState } from 'react'
import { Frozen } from '../hooks'

// only on initial load
let hasLoaded = false

export const SuspenseFallbackLastContents = ({ children }: { children: any }) => {
  const [last] = useState(children)

  useEffect(() => {
    // TODO hacky but works for now
    setTimeout(() => {
      hasLoaded = true
    }, 500)
  }, [])

  return <Suspense fallback={<Frozen on>{last}</Frozen>}>{children}</Suspense>
}
