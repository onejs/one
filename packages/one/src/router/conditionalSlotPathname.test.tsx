import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { describe, expect, it } from 'vitest'
import { usePathname } from '../hooks'
import { Root } from '../Root'
import { Slot } from '../views/Navigator'

// react-test-renderer needs both of these; neither exists in a bare node env
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
;(globalThis as any).requestAnimationFrame ??= (cb: any) => setTimeout(() => cb(0), 0)
;(globalThis as any).cancelAnimationFrame ??= (id: any) => clearTimeout(id)

const routerRoot = 'app'

// route modules are passed as objects rather than importers so the route context
// resolves them synchronously; bumping the version makes Root build a fresh
// route tree per test instead of reusing the module-level cache
function makeRoutes(modules: Record<string, { default: React.ComponentType<any> }>) {
  globalThis['__vxrnVersion'] = ((globalThis['__vxrnVersion'] as number) ?? 0) + 1
  const routes: Record<string, unknown> = {}
  for (const [file, module] of Object.entries(modules)) {
    routes[`/${routerRoot}/${file}`] = module
  }
  return routes as any
}

const slotLayout = { default: () => <Slot /> }
const leaf = (label: string) => ({ default: () => label })

// `/project/:projectId/:sessionId` lives four navigators below the root, under a
// route group, so a gate on the group's layout leaves three of them unmounted
function routeTreeWithGate(gate: React.ComponentType<{ children: React.ReactNode }>) {
  const Gate = gate
  return makeRoutes({
    '_layout.tsx': slotLayout,
    '(app)/_layout.tsx': {
      default: () => (
        <Gate>
          <Slot />
        </Gate>
      ),
    },
    '(app)/index.tsx': leaf('app-index'),
    '(app)/project/_layout.tsx': slotLayout,
    '(app)/project/[projectId]/_layout.tsx': slotLayout,
    '(app)/project/[projectId]/[sessionId]/_layout.tsx': slotLayout,
    '(app)/project/[projectId]/[sessionId]/index.tsx': leaf('session'),
    '(site)/_layout.tsx': slotLayout,
    '(site)/pricing.tsx': leaf('pricing'),
  })
}

function renderAt(path: string, routes: any) {
  let renderer: TestRenderer.ReactTestRenderer
  act(() => {
    renderer = TestRenderer.create(
      <Root path={path} routes={routes} routerRoot={routerRoot} isClient={false} />
    )
  })
  return renderer!
}

function bodyText(renderer: TestRenderer.ReactTestRenderer) {
  const collect = (node: any): string =>
    typeof node === 'string'
      ? node
      : Array.isArray(node)
        ? node.map(collect).join('')
        : node
          ? collect(node.children ?? [])
          : ''
  return collect(renderer.toJSON())
}

describe('a layout that renders something other than its <Slot />', () => {
  it('does not move the pathname while the URL stands still', () => {
    const pathnames: string[] = []
    let setBlocked: ((blocked: boolean) => void) | undefined

    function Probe() {
      const pathname = usePathname()
      if (pathnames[pathnames.length - 1] !== pathname) pathnames.push(pathname)
      return null
    }

    function Gate({ children }: { children: React.ReactNode }) {
      const [blocked, set] = React.useState(true)
      setBlocked = set
      return (
        <>
          <Probe />
          {blocked ? 'placeholder' : children}
        </>
      )
    }

    const renderer = renderAt('/project/p1/main', routeTreeWithGate(Gate))

    // the gate starts blocked, so the three navigators below it never mounted
    expect(bodyText(renderer)).toBe('placeholder')

    act(() => setBlocked!(false))
    expect(bodyText(renderer)).toBe('session')

    act(() => setBlocked!(true))
    expect(bodyText(renderer)).toBe('placeholder')

    act(() => setBlocked!(false))

    // the address bar never moved, so neither may usePathname(). unmounting the
    // navigators used to collapse it to '/', which is a route the app is not on
    expect(pathnames).toEqual(['/project/p1/main'])
  })

  it('settles when the gate itself reads the pathname', async () => {
    // an access gate that blocks project routes once a check says the route is
    // not proven yet — the shape that turned the collapse into an unbounded
    // loop, because blocking changed the very pathname the gate decides from
    let renders = 0
    let requestBlock: (() => void) | undefined

    function Gate({ children }: { children: React.ReactNode }) {
      const pathname = usePathname()
      const [blockRequested, setBlockRequested] = React.useState(false)
      requestBlock = () => setBlockRequested(true)
      renders++
      if (renders > 100) {
        throw new Error(`gate rendered ${renders} times without settling`)
      }
      const blocked = blockRequested && pathname.startsWith('/project/')
      return <>{blocked ? 'blocked' : children}</>
    }

    const renderer = renderAt('/project/p1/main', routeTreeWithGate(Gate))
    await act(async () => {})
    expect(bodyText(renderer)).toBe('session')

    await act(async () => requestBlock!())
    await act(async () => {})

    // blocking unmounts the navigators below, which must not report a pathname
    // the gate reads as a different route — that flips the gate back open, which
    // remounts them, which reports the project route again, forever
    expect(bodyText(renderer)).toBe('blocked')
    expect(renders).toBeLessThan(20)
  })
})
