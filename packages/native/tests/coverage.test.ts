import { describe, expect, it } from 'vitest'
import { computeCoverage } from '../codegen/coverage'
import type { Declaration } from '../codegen/inventory'

const declaration = (overrides: Partial<Declaration> = {}): Declaration => ({
  module: 'SwiftUI',
  owner: '',
  kind: 'struct',
  name: 'Button',
  attributes: [],
  parameters: [],
  line: 1,
  ...overrides,
})

const view = (module: string, name: string, overrides: Partial<Declaration> = {}) =>
  declaration({ module, kind: 'struct', owner: '', name, ...overrides })

const modifier = (module: string, name: string, overrides: Partial<Declaration> = {}) =>
  declaration({
    module,
    kind: 'func',
    owner: 'SwiftUICore.View',
    name,
    ...overrides,
  })

describe('computeCoverage', () => {
  it('reports mapped and unmapped views and modifiers per module', () => {
    const inventory = [
      view('SwiftUI', 'Button'),
      view('SwiftUI', 'List'),
      view('_MapKit_SwiftUI', 'Map'),
      modifier('SwiftUI', 'padding'),
      modifier('SwiftUI', 'frame'),
      modifier('_WebKit_SwiftUI', 'webViewMagnificationGestures'),
    ]
    const { modules, totals } = computeCoverage(
      inventory,
      {
        views: { SwiftUI: ['Button'] },
        modifiers: { SwiftUI: ['padding'], _WebKit_SwiftUI: ['webViewMagnificationGestures'] },
      },
      ['SwiftUI', '_MapKit_SwiftUI', '_WebKit_SwiftUI'],
      26
    )
    expect(modules.SwiftUI.views).toMatchObject({
      mapped: 1,
      total: 2,
      mappedNames: ['Button'],
      unmappedNames: ['List'],
    })
    expect(modules.SwiftUI.modifiers).toMatchObject({
      mapped: 1,
      total: 2,
      mappedNames: ['padding'],
      unmappedNames: ['frame'],
    })
    expect(modules._MapKit_SwiftUI.views).toMatchObject({ mapped: 0, total: 1 })
    expect(modules._WebKit_SwiftUI.modifiers).toMatchObject({ mapped: 1, total: 1 })
    expect(totals.views).toMatchObject({ mapped: 1, total: 3 })
    expect(totals.modifiers).toMatchObject({ mapped: 2, total: 3 })
  })

  it('excludes nested structs, SPI, and unavailable declarations from the universe', () => {
    const inventory = [
      view('SwiftUI', 'Button'),
      view('SwiftUI', 'TimingCurve', { owner: 'Animation' }),
      view('SwiftUI', '_ConditionalContent'),
      view('SwiftUI', 'OldView', { attributes: ['@available(*, unavailable)'] }),
      modifier('SwiftUI', 'padding'),
      modifier('SwiftUI', '_spy'),
    ]
    const { modules } = computeCoverage(inventory, { views: {}, modifiers: {} }, ['SwiftUI'], 26)
    expect(modules.SwiftUI.views).toMatchObject({
      total: 1,
      unmappedNames: ['Button'],
    })
    expect(modules.SwiftUI.modifiers).toMatchObject({
      total: 1,
      unmappedNames: ['padding'],
    })
  })

  it('counts above-ceiling names separately instead of as unmapped', () => {
    const inventory = [
      view('SwiftUI', 'Button'),
      view('SwiftUI', 'FutureView', { attributes: ['@available(iOS 27.0, *)'] }),
      modifier('SwiftUI', 'padding'),
      modifier('SwiftUI', 'futureModifier', { attributes: ['@available(iOS 27.0, *)'] }),
    ]
    const { modules, totals } = computeCoverage(
      inventory,
      { views: {}, modifiers: {} },
      ['SwiftUI'],
      26
    )
    expect(modules.SwiftUI.views).toMatchObject({
      total: 1,
      aboveCeiling: 1,
      unmappedNames: ['Button'],
    })
    expect(modules.SwiftUI.modifiers).toMatchObject({
      total: 1,
      aboveCeiling: 1,
      unmappedNames: ['padding'],
    })
    expect(totals.views.aboveCeiling).toBe(1)
    expect(totals.modifiers.aboveCeiling).toBe(1)
  })

  it('counts soft-deprecated declarations the SDK still ships', () => {
    const inventory = [
      view('SwiftUI', 'OldView', { attributes: ['@available(iOS, introduced: 13.0, deprecated: 27.0)'] }),
      modifier('SwiftUI', 'oldModifier', {
        attributes: ['@available(iOS, introduced: 13.0, deprecated: 27.0)'],
      }),
    ]
    const { modules } = computeCoverage(inventory, { views: {}, modifiers: {} }, ['SwiftUI'], 26)
    expect(modules.SwiftUI.views).toMatchObject({ total: 1, unmappedNames: ['OldView'] })
    expect(modules.SwiftUI.modifiers).toMatchObject({ total: 1, unmappedNames: ['oldModifier'] })
  })

  it('keeps a covered name that left the universe instead of dropping it', () => {
    const { modules } = computeCoverage(
      [view('SwiftUI', 'Button')],
      {
        views: { SwiftUI: ['Button', 'Renamed'] },
        modifiers: {},
      },
      ['SwiftUI'],
      26
    )
    expect(modules.SwiftUI.views).toMatchObject({
      mapped: 2,
      total: 2,
      mappedNames: ['Button', 'Renamed'],
      unmappedNames: [],
    })
  })
})
