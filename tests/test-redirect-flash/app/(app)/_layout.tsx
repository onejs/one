import { Suspense } from 'react'
import { Slot, usePathname } from 'one'

// reproduces soot's redirect-flash bug (commit ea96e360) with three ingredients:
//   1. parent layout reads usePathname()
//   2. a Suspense boundary above the <Slot />, with something that suspends
//      briefly during hydration (mimicking Zero sync / useLoader / provider init)
//   3. a home route (index.tsx) that calls router.replace on mount when a
//      gate passes (mimicking soot's HomePage redirect to /project/{activeProject.id})
//
// when these three are in place AND the project route is hoisted into this
// navigator (i.e. no intermediate _layout.tsx files at project/ and
// project/[projectId]/), the bug fires on initial load of /project/foo:
//   - react hydrates and project route mounts correctly (url = /project/foo)
//   - suspense boundary commits fallback, resolves, triggers re-render
//   - on re-render the navigator re-initializes, picks `index` as the
//     first child (because all routes are hoisted as flat siblings)
//   - home route mounts while url is still /project/foo
//   - react navigation's linking syncs the navigator state to the URL,
//     changing the browser URL to /
//   - home's useEffect fires router.replace based on the now-/ URL
//
// the fix: nested _layout.tsx passthroughs at project/ and project/[projectId]/
// give each directory its own navigator tier, so on re-initialization the
// nested navigators can't mis-pick index as a sibling of [projectId].

function parseProjectId(pathname: string): string | null {
  const match = pathname.match(/^\/project\/([^/]+)/)
  return match ? match[1] : null
}

// one-shot suspense: first render throws a promise, subsequent renders return
// null. this mimics a Zero query or loader fetching async on first render.
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
  // set the gate flags that the home route's redirect checks
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
