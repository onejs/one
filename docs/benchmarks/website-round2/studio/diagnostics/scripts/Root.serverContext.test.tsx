import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { expect, it } from 'vitest'
import { Root } from './Root'
import { Slot } from './views/Navigator'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

it('uses the rendering root context after another environment evaluates One', async () => {
  const previousReader = globalThis['__vxrnGetContextFromReactContext']
  const previousStore = globalThis['__vxrnrequestAsyncLocalStore']
  const previousVersion = globalThis['__vxrnVersion']
  const id = { _id: 1 }
  const observed: unknown[] = []
  globalThis['__vxrnrequestAsyncLocalStore'] = { getStore: () => id }
  globalThis['__vxrnGetContextFromReactContext'] = () => {
    throw new Error('context reader from another React runtime')
  }
  function Page() {
    observed.push(globalThis['__vxrnGetContextFromReactContext']())
    return 'ready'
  }
  function Layout() {
    return <Slot />
  }
  globalThis['__vxrnVersion'] = ((globalThis['__vxrnVersion'] as number) ?? 0) + 1
  let renderer: TestRenderer.ReactTestRenderer | undefined
  try {
    await act(async () => {
      renderer = TestRenderer.create(
        <Root
          path="/"
          routerRoot="app"
          isClient={false}
          routes={
            {
              '/app/_layout.tsx': { default: Layout },
              '/app/index.tsx': { default: Page },
            } as any
          }
        />
      )
    })
    expect(observed.length).toBeGreaterThan(0)
    expect(observed.every((value) => value === id)).toBe(true)
  } finally {
    if (renderer) await act(async () => renderer!.unmount())
    globalThis['__vxrnGetContextFromReactContext'] = previousReader
    globalThis['__vxrnrequestAsyncLocalStore'] = previousStore
    globalThis['__vxrnVersion'] = previousVersion
  }
})
