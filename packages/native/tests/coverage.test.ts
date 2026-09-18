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
      ['SwiftUI', '_MapKit_SwiftUI', '_WebKit_SwiftUI']
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
    const { modules } = computeCoverage(
      inventory,
      { views: {}, modifiers: {} },
      ['SwiftUI']
    )
    expect(modules.SwiftUI.views).toMatchObject({
      total: 1,
      unmappedNames: ['Button'],
    })
    expect(modules.SwiftUI.modifiers).toMatchObject({
      total: 1,
      unmappedNames: ['padding'],
    })
  })

  it('keeps a covered name that left the universe instead of dropping it', () => {
    const { modules } = computeCoverage([view('SwiftUI', 'Button')], {
      views: { SwiftUI: ['Button', 'Renamed'] },
      modifiers: {},
    }, ['SwiftUI'])
    expect(modules.SwiftUI.views).toMatchObject({
      mapped: 2,
      total: 2,
      mappedNames: ['Button', 'Renamed'],
      unmappedNames: [],
    })
  })
})
