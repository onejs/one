import { Slot, router, routerStore, usePathname } from 'one'
import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

// mirrors soot's app/(site)/_layout.tsx — just passes through <Slot />.
export default function SiteLayout() {
  const pathname = usePathname()
  const [tick, setTick] = useState(0)
  const isProjectRoute = pathname.startsWith('/project/')

  useEffect(() => {
    if (typeof window === 'undefined' || !isProjectRoute) return

    const w = window as unknown as {
      __projectRenders?: Array<{
        at: number
        url: string
        pathname: string
        tick: number
      }>
      __simulateProjectRootStateRace?: () => void
    }

    w.__projectRenders ??= []
    w.__projectRenders.push({
      at: performance.now(),
      url: location.pathname,
      pathname,
      tick,
    })
    w.__simulateProjectRootStateRace = () => {
      const storeSnapshot = routerStore.snapshot() as unknown as {
        linking?: {
          config?: unknown
          getStateFromPath?: (path: string, config?: unknown) => unknown
        }
      }
      const state = storeSnapshot.linking?.getStateFromPath?.(
        '/project/new/main',
        storeSnapshot.linking.config
      )
      if (!state) {
        throw new Error('failed to create project navigation state')
      }

      const navigationRef = routerStore.navigationRef as unknown as {
        getRootState: () => unknown
      }
      const originalGetRootState = navigationRef.getRootState

      window.history.replaceState(window.history.state, '', '/project/new/main')

      navigationRef.getRootState = () => state
      flushSync(() => {
        setTick((value) => value + 1)
      })
      navigationRef.getRootState = originalGetRootState
    }

    return () => {
      delete w.__simulateProjectRootStateRace
    }
  }, [isProjectRoute, pathname, tick])

  return (
    <>
      {isProjectRoute && (
        <div id="project-layout">
          <span id="project-topbar-pathname">{pathname}</span>
          <span id="project-render-tick">{tick}</span>
          <button
            id="create-project"
            type="button"
            onClick={async () => {
              await router.replace('/project/new/main' as never)
            }}
          >
            create
          </button>
        </div>
      )}
      <Slot />
    </>
  )
}
