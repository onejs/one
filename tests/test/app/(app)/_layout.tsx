import { useEffect } from 'react'
import { Slot } from 'one'

// (app) route group comes BEFORE (hydration-delay) alphabetically
// This mimics takeout3's structure where (app) and (site) coexisted
export default function AppLayout() {
  useEffect(() => {
    const w = window as any
    w.__appRouteGroupLayoutMountCount = (w.__appRouteGroupLayoutMountCount || 0) + 1

    return () => {
      w.__appRouteGroupLayoutUnmountCount = (w.__appRouteGroupLayoutUnmountCount || 0) + 1
    }
  }, [])

  return (
    <>
      <div id="app-route-group-layout-marker" hidden />
      <Slot />
    </>
  )
}
