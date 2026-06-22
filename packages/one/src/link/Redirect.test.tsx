import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'

// run the focus effect like a plain mounted effect (i.e. screen is focused)
vi.mock('../useFocusEffect', () => ({
  useFocusEffect: (effect: () => void | (() => void), deps: any[]) =>
    React.useEffect(effect, deps),
}))

const replaceCalls: string[] = []
let resolvePending: (() => void) | undefined

vi.mock('../hooks', () => ({
  useRouter: () => ({
    replace: (href: string) => {
      replaceCalls.push(href)
      // a pending promise mimics linkTo awaiting route preload before dispatch
      return new Promise<void>((resolve) => {
        resolvePending = resolve
      })
    },
  }),
}))

import { Redirect } from './Redirect'

async function flush() {
  // let the replace() promise's .finally run
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('Redirect', () => {
  it('fires replace once across the mount/unmount churn of an auth-state settle', async () => {
    replaceCalls.length = 0

    // simulate the auth gate flipping logged-in -> loading -> logged-in -> ...
    // each flip remounts <Redirect> while the first replace is still in flight
    for (let i = 0; i < 8; i++) {
      let r: TestRenderer.ReactTestRenderer
      act(() => {
        r = TestRenderer.create(<Redirect href="/home" />)
      })
      act(() => {
        r!.unmount()
      })
    }

    expect(replaceCalls).toEqual(['/home'])

    // once the navigation settles, the in-flight guard clears...
    resolvePending?.()
    await flush()

    // ...so a genuinely new redirect to the same target fires again
    act(() => {
      TestRenderer.create(<Redirect href="/home" />)
    })
    expect(replaceCalls).toEqual(['/home', '/home'])

    resolvePending?.()
    await flush()
  })

  it('does not re-fire within a single mounted instance', async () => {
    replaceCalls.length = 0

    let r: TestRenderer.ReactTestRenderer
    act(() => {
      r = TestRenderer.create(<Redirect href="/login" />)
    })
    // a re-render of the same instance must not re-issue navigation
    act(() => {
      r!.update(<Redirect href="/login" />)
    })

    expect(replaceCalls).toEqual(['/login'])

    resolvePending?.()
    await flush()
  })
})
