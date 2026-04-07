import { Suspense } from 'react'
import { Slot, usePathname } from 'one'

// mirrors soot's (app)/_layout.tsx:
//   1. reads usePathname() (causes re-renders on route change)
//   2. Suspense boundary that suspends briefly during hydration
//      (mimics Zero/auth provider init)
//   3. many sibling leaf routes (deploy, factory, editor, prod, etc.)
//
// the bug scenario: loading / should mount the index route, but during
// spa-shell hydration the navigator briefly picks a wrong sibling (e.g.
// deploy) and pushes its URL before correcting.

function parseProjectId(pathname: string): string | null {
  const match = pathname.match(/^\/project\/([^/]+)/)
  return match ? match[1] : null
}

let suspenseResolved = false
let suspensePromise: Promise<void> | null = null

function SuspendingInit() {
  if (typeof window === 'undefined') return null
  if (!suspenseResolved) {
    if (!suspensePromise) {
      suspensePromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          suspenseResolved = true
          resolve()
        }, 20)
      })
    }
    throw suspensePromise
  }
  const w = window as any
  if (!w.__testUserReady) {
    w.__testUserReady = true
    w.__testProjectResolved = true
  }
  return null
}

export default function AppLayout() {
  const pathname = usePathname()
  const projectId = parseProjectId(pathname)

  return (
    <div id="app-container" data-pathname={pathname} data-project-id={projectId ?? ''}>
      <Suspense fallback={<div id="app-fallback">loading</div>}>
        <SuspendingInit />
        <Slot />
      </Suspense>
    </div>
  )
}
