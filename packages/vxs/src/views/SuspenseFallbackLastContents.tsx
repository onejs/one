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

  // const FallbackComponent = () => {
  //   console.log('falling back!', { hasLoaded, last, children })
  //   // TODO the non Frozen versions "works" but it causes mayhem due to the tree running logic
  //   // this would be good for React.Offscreen/Activity but not out
  //   // tried react-freeze but it brings back the flickering
  //   // tried Frozen but i'd have to disable a variety of hooks, will first look to see if better solution
  //   // null
  //   return
  // }

  return <Suspense fallback={<Frozen on>{last}</Frozen>}>{children}</Suspense>
}
