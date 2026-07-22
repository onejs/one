import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'

const platform = vi.hoisted(() => ({ current: 'web' }))
vi.mock('../../../utils/platform', () => ({
  get PLATFORM() {
    return platform.current
  },
}))

const setOptions = vi.fn()

vi.mock('../../../router/useNavigation', () => ({
  useNavigation: () => ({ setOptions }),
}))

import { StackToolbar } from '../StackToolbar'

describe('StackToolbar runtime options', () => {
  afterEach(() => {
    platform.current = 'web'
    setOptions.mockClear()
  })

  it('does not write undefined header overrides when the toolbar unmounts', () => {
    platform.current = 'ios'
    let renderer: TestRenderer.ReactTestRenderer

    act(() => {
      renderer = TestRenderer.create(
        <StackToolbar placement="right">
          <StackToolbar.Button icon="bell" />
        </StackToolbar>
      )
    })

    expect(setOptions).toHaveBeenCalledTimes(1)
    expect(setOptions).toHaveBeenLastCalledWith(
      expect.objectContaining({
        headerShown: true,
        unstable_headerRightItems: expect.any(Function),
      })
    )

    act(() => renderer!.unmount())

    expect(setOptions).toHaveBeenCalledTimes(1)
  })
})
