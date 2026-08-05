import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { describe, expect, it } from 'vitest'
import { Protected } from '../views/Protected'
import { Screen } from '../views/Screen'
import { useFilterScreenChildren } from './withLayoutContext'

function readGuardedRedirects(children: React.ReactNode) {
  let result: ReturnType<typeof useFilterScreenChildren> | undefined

  function Capture() {
    result = useFilterScreenChildren(children)
    return null
  }

  act(() => {
    TestRenderer.create(<Capture />)
  })

  return result!.guardedRedirects
}

describe('Protected redirectTo', () => {
  it('associates a failed guard redirect with each protected screen', () => {
    const redirects = readGuardedRedirects(
      <Protected guard={false} redirectTo="/login">
        <Screen name="dashboard" />
        <Screen name="settings" />
      </Protected>
    )

    expect(Array.from(redirects)).toEqual([
      ['dashboard', '/login'],
      ['settings', '/login'],
    ])
  })

  it('uses the innermost failing guard redirect', () => {
    const redirects = readGuardedRedirects(
      <Protected guard={false} redirectTo="/login">
        <Protected guard={false} redirectTo="/subscribe">
          <Screen name="premium" />
        </Protected>
      </Protected>
    )

    expect(redirects.get('premium')).toBe('/subscribe')
  })

  it('inherits a failed parent redirect through a passing child guard', () => {
    const redirects = readGuardedRedirects(
      <Protected guard={false} redirectTo="/login">
        <Protected guard>
          <Screen name="account" />
        </Protected>
      </Protected>
    )

    expect(redirects.get('account')).toBe('/login')
  })

  it('ignores redirectTo on a passing parent guard', () => {
    const redirects = readGuardedRedirects(
      <Protected guard redirectTo="/login">
        <Protected guard={false}>
          <Screen name="account" />
        </Protected>
      </Protected>
    )

    expect(redirects.has('account')).toBe(true)
    expect(redirects.get('account')).toBeUndefined()
  })
})
