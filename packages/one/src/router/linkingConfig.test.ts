import { describe, expect, it } from 'vitest'
import { getMockContext } from '../testing-utils'
import { getLinkingConfig } from './getLinkingConfig'
import { getRoutes } from './getRoutes'
import { getResolvedLinking, resetLinking, setupLinking } from './linkingConfig'

describe('setupLinking', () => {
  const routes = () => getRoutes(getMockContext(['_layout.tsx', 'index.tsx']))!

  it('keeps the base getInitialURL and returns no state without a location', () => {
    resetLinking()
    const initialState = setupLinking(routes(), undefined)

    // native starts with no location: no baked-in state overrides linking,
    // and the platform getInitialURL (Linking.getInitialURL on native) stays
    // wired so a cold deep link resolves through it.
    expect(initialState).toBeUndefined()
    expect(getResolvedLinking()?.getInitialURL).toBe(
      getLinkingConfig(routes(), true).getInitialURL
    )
  })

  it('overrides getInitialURL and derives state from a location', () => {
    resetLinking()
    const initialState = setupLinking(routes(), new URL('http://localhost/'))

    expect(initialState).toBeDefined()
    expect(getResolvedLinking()?.getInitialURL?.()).toBe('http://localhost/')
  })

  it('does not leak a location override into a later location-less setup', () => {
    resetLinking()
    setupLinking(routes(), new URL('http://localhost/'))
    resetLinking()
    setupLinking(routes(), undefined)

    expect(getResolvedLinking()?.getInitialURL).toBe(
      getLinkingConfig(routes(), true).getInitialURL
    )
  })
})
