import { describe, expect, it, vi } from 'vitest'
import React, { createElement, useId, useState, type ReactNode } from 'react'
import TestRenderer, { act } from 'react-test-renderer'

import { WebStackView } from '../WebStackView'
import { StackRenderProvider, type StackRender } from '../ScreenRenderContext'

function makeRoute(name: string) {
  return { key: `${name}-key`, name, params: undefined }
}

function makeState(names: string[], index: number) {
  return {
    key: 'stack-1',
    index,
    routeNames: names,
    routes: names.map(makeRoute),
    type: 'stack',
    stale: false,
    preloadedRoutes: [],
  } as any
}

type DescOpts = {
  options: any
  content: ReactNode
}

function makeDescriptors(perRoute: Record<string, DescOpts>) {
  const out: Record<string, any> = {}
  for (const name of Object.keys(perRoute)) {
    out[`${name}-key`] = {
      options: perRoute[name]!.options,
      render: () => perRoute[name]!.content,
      navigation: {},
    }
  }
  return out
}

// Default render used in regular (non-keepMounted) tests: unmounts content
// when closed.
const PassThroughRender = ({ children, open }: any) =>
  open ? createElement('div', { 'data-open': 'true' }, children) : null

// Render that keeps children mounted when closed - required for keepMounted
// to actually preserve component state. Mirrors how Tamagui Sheet / Vaul
// behave when `modal` is true and `open` toggles.
const KeepMountedRender = ({ children, open }: any) =>
  createElement(
    'div',
    {
      'data-open': String(open),
      style: { display: open ? 'block' : 'none' },
    },
    children
  )

// A probe component that exposes its id via a callback so we can assert
// identity stability across re-renders.
function IdProbe({ onId }: { onId: (id: string) => void }) {
  const id = useId()
  React.useEffect(() => {
    onId(id)
  }, [id, onId])
  return createElement('span', { 'data-id': id })
}

// A probe that tracks how often it mounts (effect runs with []).
function MountProbe({ onMount }: { onMount: () => void }) {
  React.useEffect(() => {
    onMount()
  }, [onMount])
  return null
}

// A probe with internal state we can manipulate via a captured setter.
function StatefulProbe({
  initial,
  onMount,
}: {
  initial: number
  onMount: (setter: (v: number) => void) => void
}) {
  const [value, setValue] = useState(initial)
  React.useEffect(() => {
    onMount(setValue)
  }, [onMount])
  return createElement('span', { 'data-value': String(value) })
}

describe('useId stability', () => {
  it('returns the same id across parent re-renders for the same mount', () => {
    const captured: string[] = []
    const onId = (id: string) => captured.push(id)

    const state = makeState(['home', 'sheet'], 1)
    const descriptors = makeDescriptors({
      home: { options: { presentation: 'card' }, content: null },
      sheet: {
        options: { presentation: 'formSheet' },
        content: createElement(IdProbe, { onId }),
      },
    })
    const navigation = { dispatch: vi.fn() } as any

    let testRoot: TestRenderer.ReactTestRenderer
    act(() => {
      testRoot = TestRenderer.create(
        createElement(
          StackRenderProvider,
          { value: { web: KeepMountedRender } as StackRender },
          createElement(WebStackView, {
            state,
            navigation,
            descriptors: descriptors as any,
          })
        )
      )
    })

    const firstId = captured.at(-1)!
    expect(firstId).toBeTruthy()

    // Force the parent to re-render with the same state. The route's
    // useId must return the same value.
    act(() => {
      testRoot!.update(
        createElement(
          StackRenderProvider,
          { value: { web: KeepMountedRender } as StackRender },
          createElement(WebStackView, {
            state,
            navigation,
            descriptors: descriptors as any,
          })
        )
      )
    })

    const secondId = captured.at(-1)!
    expect(secondId).toBe(firstId)
  })
})

describe('regular overlay (no keepMounted) lifecycle', () => {
  it('mounts once on open, unmounts on pop', () => {
    const mounts: number[] = []
    const onMount = () => mounts.push(Date.now())

    const stateOpen = makeState(['home', 'sheet'], 1)
    const stateClosed = makeState(['home'], 0)
    const descriptors = makeDescriptors({
      home: { options: { presentation: 'card' }, content: null },
      sheet: {
        options: { presentation: 'formSheet' },
        content: createElement(MountProbe, { onMount }),
      },
    })
    const navigation = { dispatch: vi.fn() } as any

    let testRoot: TestRenderer.ReactTestRenderer
    act(() => {
      testRoot = TestRenderer.create(
        createElement(
          StackRenderProvider,
          { value: { web: KeepMountedRender } as StackRender },
          createElement(WebStackView, {
            state: stateOpen,
            navigation,
            descriptors: descriptors as any,
          })
        )
      )
    })
    expect(mounts).toHaveLength(1)

    // Re-render with sheet popped. Mount probe should NOT mount again on
    // re-renders, but it WILL unmount because the route is gone.
    act(() => {
      testRoot!.update(
        createElement(
          StackRenderProvider,
          { value: { web: KeepMountedRender } as StackRender },
          createElement(WebStackView, {
            state: stateClosed,
            navigation,
            descriptors: descriptors as any,
          })
        )
      )
    })
    expect(mounts).toHaveLength(1)

    // Re-open the sheet (new route key would normally be assigned but for
    // this test we reuse). Mount probe re-mounts because the previous
    // mount unmounted.
    act(() => {
      testRoot!.update(
        createElement(
          StackRenderProvider,
          { value: { web: KeepMountedRender } as StackRender },
          createElement(WebStackView, {
            state: stateOpen,
            navigation,
            descriptors: descriptors as any,
          })
        )
      )
    })
    expect(mounts).toHaveLength(2)
  })
})

describe('keepMounted overlay lifecycle', () => {
  it('survives dismissal: state persists when route is popped and re-opened', () => {
    const mounts: number[] = []
    let setValue: ((v: number) => void) | undefined

    const stateOpen = makeState(['home', 'settings'], 1)
    const stateClosed = makeState(['home'], 0)

    // Stable content reference - re-creating it would break the persistent
    // slot's element identity. In real navigation, descriptor.render() is
    // called only once when the route is first captured; here we mimic
    // that by computing it once.
    const stableContent = createElement(StatefulProbe, {
      initial: 7,
      onMount: (setter) => {
        mounts.push(Date.now())
        setValue = setter
      },
    })

    const descriptors = makeDescriptors({
      home: { options: { presentation: 'card' }, content: null },
      settings: {
        options: { presentation: 'formSheet', keepMounted: true },
        content: stableContent,
      },
    })
    const navigation = { dispatch: vi.fn() } as any

    let testRoot: TestRenderer.ReactTestRenderer
    act(() => {
      testRoot = TestRenderer.create(
        createElement(
          StackRenderProvider,
          { value: { web: KeepMountedRender } as StackRender },
          createElement(WebStackView, {
            state: stateOpen,
            navigation,
            descriptors: descriptors as any,
          })
        )
      )
    })
    expect(mounts).toHaveLength(1)
    expect(typeof setValue).toBe('function')

    // Mutate the state of the mounted component.
    act(() => {
      setValue!(42)
    })

    // Re-render with the route popped from navigation state. Persistent
    // slot keeps rendering the captured element with open=false.
    act(() => {
      testRoot!.update(
        createElement(
          StackRenderProvider,
          { value: { web: KeepMountedRender } as StackRender },
          createElement(WebStackView, {
            state: stateClosed,
            navigation,
            // descriptor for 'settings' no longer present in state.routes -
            // we keep the same map so the captured slot still works.
            descriptors: descriptors as any,
          })
        )
      )
    })
    // Mount probe should NOT remount; only one mount across the lifecycle.
    expect(mounts).toHaveLength(1)

    // Re-open: persistent slot's open transitions to true. Component
    // instance must be the same - value should still be 42 not 7.
    act(() => {
      testRoot!.update(
        createElement(
          StackRenderProvider,
          { value: { web: KeepMountedRender } as StackRender },
          createElement(WebStackView, {
            state: stateOpen,
            navigation,
            descriptors: descriptors as any,
          })
        )
      )
    })
    expect(mounts).toHaveLength(1)

    // Inspect the rendered output for the persisted value.
    const tree = testRoot!.toJSON() as any
    const json = JSON.stringify(tree)
    expect(json).toContain('"data-value":"42"')
    expect(json).not.toContain('"data-value":"7"')
  })
})
