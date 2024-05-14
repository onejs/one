import { Suspense, useEffect, useState } from 'react'
import { Frozen } from '../hooks'

export const SuspenseFallbackLastContents = ({ children }: { children: any }) => {
  const [last, setLast] = useState(children)

  useEffect(() => {
    setLast(children)
  }, [children])

  return (
    <Suspense
      fallback={
        // TODO the non Frozen versions "works" but it causes mayhem due to the tree running logic
        // this would be good for React.Offscreen/Activity but not out
        // tried react-freeze but it brings back the flickering
        // tried Frozen but i'd have to disable a variety of hooks, will first look to see if better solution
        null
        // <Frozen on>{last}</Frozen>
      }
    >
      {children}
    </Suspense>
  )
}
