import type { NavigationState } from '@react-navigation/core'
import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getLinkingConfig } from '../router/getLinkingConfig'
import { getRoutes } from '../router/getRoutes'
import { getMockContext } from '../testing-utils'
import { getStateFromPath } from './getStateFromPath'
import { useLinking } from './useLinking.native'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

const linking = getLinkingConfig(
  getRoutes(
    getMockContext([
      '_layout.tsx',
      'home/_layout.tsx',
      'home/[projectId]/_layout.tsx',
      'home/[projectId]/index.tsx',
      'settings.tsx',
    ])
  )!
)
const config = linking.config!

const currentState: NavigationState = {
  stale: false,
  type: 'stack',
  key: 'root-stack',
  index: 1,
  routeNames: ['home', 'settings'],
  routes: [
    {
      name: 'home',
      key: 'home-travelo',
      params: { projectId: 'proj_example_travelo' },
      state: {
        stale: false,
        type: 'stack',
        key: 'home-stack',
        index: 0,
        routeNames: ['[projectId]'],
        routes: [
          {
            name: '[projectId]',
            key: 'project-travelo',
            params: { projectId: 'proj_example_travelo' },
          },
        ],
      },
    },
    { name: 'settings', key: 'settings' },
  ],
}

type LinkingOverrides = Partial<Parameters<typeof useLinking>[1]>

async function captureIncomingAction(overrides: LinkingOverrides = {}) {
  const linkedState = getStateFromPath('/home/proj_example_pennywise?tab=design', config)!
  const dispatch = vi.fn()
  let listener: ((url: string) => void) | undefined
  const navigation = {
    dispatch,
    getRootState: () => currentState,
  }
  const ref = { current: navigation }

  function Harness() {
    useLinking(
      ref as any,
      {
        ...linking,
        enabled: true,
        prefixes: ['contrast:///'],
        getInitialURL: () => null,
        getStateFromPath: () => linkedState,
        subscribe: (nextListener) => {
          listener = nextListener
          return () => {}
        },
        ...overrides,
      },
      () => {}
    )
    return null
  }

  let renderer: TestRenderer.ReactTestRenderer
  await act(async () => {
    renderer = TestRenderer.create(<Harness />)
  })
  act(() => listener!('contrast:///home/proj_example_pennywise?tab=design'))

  return {
    action: dispatch.mock.calls[0]?.[0],
    linkedState,
    renderer: renderer!,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('native incoming links', () => {
  it('applies every nested dynamic param when leaving a sibling route', async () => {
    const { action, renderer } = await captureIncomingAction()

    expect(action).toStrictEqual({
      type: 'NAVIGATE',
      target: 'root-stack',
      payload: {
        key: undefined,
        name: 'home',
        params: {
          projectId: 'proj_example_pennywise',
          screen: '[projectId]',
          params: {
            projectId: 'proj_example_pennywise',
            tab: 'design',
            screen: 'index',
            params: {
              projectId: 'proj_example_pennywise',
              tab: 'design',
            },
          },
        },
      },
    })

    act(() => renderer.unmount())
  })

  it('keeps a configured getActionFromState in control', async () => {
    const customAction = { type: 'NAVIGATE', payload: { name: 'custom' } } as const
    const getActionFromState = vi.fn(
      (_state: Parameters<NonNullable<LinkingOverrides['getActionFromState']>>[0]) =>
        customAction
    )
    const { action, linkedState, renderer } = await captureIncomingAction({
      getActionFromState,
    })

    expect(action).toBe(customAction)
    expect(getActionFromState).toHaveBeenCalledOnce()
    expect(getActionFromState.mock.calls[0]![0]).toEqual({
      ...linkedState,
      routes: [expect.not.objectContaining({ key: expect.anything() })],
    })

    act(() => renderer.unmount())
  })
})
