import { describe, expect, it } from 'vitest'
import { emitContainerHosts } from '../codegen/emitContainerHosts'
import type { Declaration } from '../codegen/inventory'

const declaration = (overrides: Partial<Declaration> = {}): Declaration => ({
  module: 'SwiftUI',
  owner: 'SwiftUI.View',
  kind: 'func',
  name: 'banner',
  attributes: [],
  parameters: [],
  line: 1,
  ...overrides,
})

// a modifier with a plain overload beside the builder overload the recipe wants,
// so selection must read the labels rather than the name.
const inventory: Declaration[] = [
  declaration({ parameters: [{ label: '_', name: 'text', type: 'Swift.String' }] }),
  declaration({
    parameters: [
      { label: 'placement', name: 'placement', type: 'Swift.String' },
      { label: 'content', name: 'content', type: '() -> V' },
    ],
    requirements: ['V : SwiftUI.View'],
  }),
  declaration({
    owner: 'SwiftUI.Group',
    kind: 'init',
    name: 'init',
    parameters: [{ label: 'content', name: 'content', type: '() -> Content' }],
    requirements: ['Content : SwiftUI.View'],
  }),
]

const marker = {
  name: 'OneNativeBannerContent',
  publicName: null,
  props: {},
  events: {},
  host: { view: 'Group', children: 'content', layout: 'marker' },
}

const host = {
  name: 'OneNativeBanner',
  publicName: 'Banner',
  props: { placement: 'string', slotName: 'string', slotValues: 'string' },
  events: { onBannerEvent: { name: 'string', value: 'string' } },
  host: {
    modifier: 'banner',
    childStack: 'Group',
    arguments: { placement: 'placement' },
    marker: { label: 'content', slot: 'OneNativeBannerContent' },
    viewSlot: { name: 'slotName', values: 'slotValues', event: 'onBannerEvent' },
    layout: 'measured',
  },
}

const emit = (components: readonly unknown[]) => {
  const outputs = new Map<string, string>()
  emitContainerHosts('', outputs, inventory, 17, 27, components as never)
  return outputs
}

describe('marker and ViewSlot hosts', () => {
  it('selects the builder overload and shows the captured marker in it', () => {
    const outputs = emit([host, marker])
    const swift = outputs.get('ios/Generated/OneNativeBannerView.swift')!
    expect(swift).toContain('.banner(placement: model.placement, content: {')
    expect(swift).toContain('if let marker = model.marker { marker }')
    expect(swift).toContain('guard child is OneNativeBannerContentView else')
  })

  it('falls back to the generated ViewSlot while the slot name is set', () => {
    const outputs = emit([host, marker])
    const swift = outputs.get('ios/Generated/OneNativeBannerView.swift')!
    expect(swift).toContain('if model.slotName.isEmpty')
    expect(swift).toContain(
      '.oneNativeViewSlot(model.slotName, values: model.slotValues, emit: model.emitSDKEvent)'
    )
    expect(swift).toContain('model.marker ?? AnyView(EmptyView())')
    const mm = outputs.get('ios/Generated/OneNativeBannerComponentView.mm')!
    expect(mm).toContain('emitter->onBannerEvent({.name = std::string(name.UTF8String)')
  })

  it('keeps the last mounted marker on remove and clears markers on reset', () => {
    const outputs = emit([host, marker])
    const swift = outputs.get('ios/Generated/OneNativeBannerView.swift')!
    expect(swift).toContain('model.marker = (markers.last as? OneNativeComposable)?.compositionContent()')
    expect(swift).toContain('for marker in markers { (marker as? OneNativeComposable)?.decompose() }')
    expect(swift).toContain('for marker in markers { (marker as? OneNativeComposable)?.propagateActive(active) }')
  })

  it('lays a marker out absolutely through the shared slot node', () => {
    const outputs = emit([host, marker])
    expect(outputs.get('cpp/OneNativeBannerContentShadowNode.h')).toContain(
      'OneNativeSlotShadowNode<OneNativeBannerContentComponentName'
    )
    expect(outputs.get('ios/Generated/OneNativeBannerContentComponentView.mm')).toContain(
      '#import "OneNativeBannerContentShadowNode.h"'
    )
  })

  it('emits no style calls for a host without a swiftStyle prop', () => {
    const outputs = emit([host, marker])
    const mm = outputs.get('ios/Generated/OneNativeBannerComponentView.mm')!
    expect(mm).not.toContain('configureSwiftStyle')
    expect(mm).not.toContain('OneNativeForwardSwiftStyleEvents')
    // a marker with no props reads nothing, so there is no props variable to warn on
    const markerMm = outputs.get('ios/Generated/OneNativeBannerContentComponentView.mm')!
    expect(markerMm).not.toContain('const auto &next')
  })

  it('rejects a ViewSlot fallback with no marker to show', () => {
    const { marker: _, ...recipe } = host.host as typeof host.host & { marker?: unknown }
    expect(() => emit([{ ...host, host: recipe }, marker])).toThrow(
      'a ViewSlot fallback shows the marker'
    )
  })

  it('rejects a marker slot without a marker layout', () => {
    const flat = { ...marker, host: { ...marker.host, layout: 'container' } }
    expect(() => emit([host, flat])).toThrow('has no marker layout')
  })

  it('rejects a marker layout no host captures', () => {
    expect(() => emit([marker])).toThrow('captured by a host')
  })
})

const sidedInventory: Declaration[] = [
  declaration({
    name: 'trim',
    parameters: [{ label: '_', name: 'text', type: 'Swift.String' }],
  }),
  declaration({
    name: 'trim',
    parameters: [
      { label: 'edge', name: 'edge', type: 'SwiftUI.Side' },
      { label: 'full', name: 'full', type: 'Swift.Bool' },
      { label: 'content', name: 'content', type: '() -> V' },
    ],
    requirements: ['V : SwiftUI.View'],
  }),
  declaration({
    owner: 'SwiftUI.Group',
    kind: 'init',
    name: 'init',
    parameters: [{ label: 'content', name: 'content', type: '() -> Content' }],
    requirements: ['Content : SwiftUI.View'],
  }),
  ...['port', 'starboard'].map((name) =>
    declaration({
      owner: 'SwiftUI.Side',
      kind: 'static',
      name,
      parameters: [],
      type: 'SwiftUI.Side',
    })
  ),
]

const sidedMarker = {
  name: 'OneNativeTrimActions',
  publicName: null,
  props: { side: 'string', full: 'boolean' },
  events: {},
  host: {
    view: 'Group',
    children: 'content',
    initial: { side: '"starboard"', full: 'true' },
    layout: 'marker',
  },
}

const sidedHost = {
  name: 'OneNativeTrim',
  publicName: 'Trim',
  props: {},
  events: {},
  host: {
    modifier: 'trim',
    childStack: 'Group',
    marker: {
      label: 'content',
      slot: 'OneNativeTrimActions',
      key: {
        prop: 'side',
        label: 'edge',
        cases: ['port', 'starboard'],
        values: { full: 'full' },
      },
    },
    layout: 'container',
  },
}

const emitSided = (components: readonly unknown[]) => {
  const outputs = new Map<string, string>()
  emitContainerHosts('', outputs, sidedInventory, 17, 27, components as never)
  return outputs
}

describe('keyed markers', () => {
  it('repeats the modifier once per case with the case and its state', () => {
    const outputs = emitSided([sidedHost, sidedMarker])
    const swift = outputs.get('ios/Generated/OneNativeTrimView.swift')!
    expect(swift).toContain(
      '.trim(edge: SwiftUI.Side.port, full: model.portFull, content: {'
    )
    expect(swift).toContain(
      '.trim(edge: SwiftUI.Side.starboard, full: model.starboardFull, content: {'
    )
    expect(swift).toContain('if let port = model.port { port }')
    expect(swift).toContain('@Published var portFull: Bool = true')
  })

  it('routes markers by key and republishes on removal or reconfiguration', () => {
    const outputs = emitSided([sidedHost, sidedMarker])
    const swift = outputs.get('ios/Generated/OneNativeTrimView.swift')!
    expect(swift).toContain('guard let marker = child as? OneNativeTrimActionsView else')
    expect(swift).toContain('if marker.side == "port" {')
    expect(swift).toContain('} else {')
    expect(swift).toContain('model.port = marker.compositionContent()')
    expect(swift).toContain('model.portFull = marker.full')
    expect(swift).toContain(
      'marker.onConfigurationChange = { [weak self] in self?.republish() }'
    )
    expect(swift).toContain('for marker in markers { publish(marker) }')
    expect(swift).toContain('private var markers: [OneNativeTrimActionsView] = []')
  })

  it('keeps marker props as view config that notifies the parent', () => {
    const outputs = emitSided([sidedHost, sidedMarker])
    const swift = outputs.get('ios/Generated/OneNativeTrimActionsView.swift')!
    expect(swift).toContain('public var side: String = "starboard"')
    expect(swift).toContain('public var full: Bool = true')
    expect(swift).toContain('var onConfigurationChange: (() -> Void)?')
    expect(swift).toContain('if changed { onConfigurationChange?() }')
    expect(swift).not.toContain('private let model')
  })

  it('rejects a case the SDK enum does not declare', () => {
    const bad = {
      ...sidedHost,
      host: {
        ...sidedHost.host,
        marker: {
          ...sidedHost.host.marker,
          key: { ...sidedHost.host.marker.key, cases: ['port', 'lee'] },
        },
      },
    }
    expect(() => emitSided([bad, sidedMarker])).toThrow('has no SDK case lee')
  })

  it('rejects a key over a label with no SDK cases', () => {
    const stringInventory: Declaration[] = [
      declaration({
        name: 'shade',
        parameters: [
          { label: 'tone', name: 'tone', type: 'Swift.String' },
          { label: 'content', name: 'content', type: '() -> V' },
        ],
        requirements: ['V : SwiftUI.View'],
      }),
      declaration({
        owner: 'SwiftUI.Group',
        kind: 'init',
        name: 'init',
        parameters: [{ label: 'content', name: 'content', type: '() -> Content' }],
        requirements: ['Content : SwiftUI.View'],
      }),
    ]
    const outputs = new Map<string, string>()
    const shadeMarker = {
      name: 'OneNativeShadeActions',
      publicName: null,
      props: { tone: 'string' },
      events: {},
      host: { view: 'Group', children: 'content', layout: 'marker' },
    }
    const shadeHost = {
      name: 'OneNativeShade',
      publicName: 'Shade',
      props: {},
      events: {},
      host: {
        modifier: 'shade',
        childStack: 'Group',
        marker: {
          label: 'content',
          slot: 'OneNativeShadeActions',
          key: { prop: 'tone', label: 'tone', cases: ['light'] },
        },
        layout: 'container',
      },
    }
    expect(() =>
      emitContainerHosts('', outputs, stringInventory, 17, 27, [shadeHost, shadeMarker] as never)
    ).toThrow('has no cases to key markers by')
  })

  it('rejects props on a single marker and a ViewSlot fallback on keyed cases', () => {
    const single = {
      ...sidedHost,
      host: { ...sidedHost.host, marker: { label: 'content', slot: 'OneNativeTrimActions' } },
    }
    expect(() => emitSided([single, sidedMarker])).toThrow('key them by property')
    const slotted = {
      ...sidedHost,
      props: { slotName: 'string', slotValues: 'string' },
      events: { onTrimEvent: { name: 'string', value: 'string' } },
      host: {
        ...sidedHost.host,
        viewSlot: { name: 'slotName', values: 'slotValues', event: 'onTrimEvent' },
      },
    }
    expect(() => emitSided([slotted, sidedMarker])).toThrow('not keyed cases')
  })

  it('rejects one label claimed by two roles', () => {
    // children and the marker sharing content would capture the marker while
    // the body renders only the children, so the marker silently disappears
    const shared = {
      name: 'OneNativeBanner',
      publicName: 'Banner',
      props: {},
      events: {},
      host: {
        view: 'Group',
        children: 'content',
        marker: { label: 'content', slot: 'OneNativeBannerContent' },
        layout: 'container',
      },
    }
    expect(() => emit([shared, marker])).toThrow('label content is claimed by children and marker')
    const argued = {
      ...host,
      props: { ...host.props, overlay: 'string' },
      host: { ...host.host, arguments: { placement: 'placement', content: 'overlay' } },
    }
    expect(() => emit([argued, marker])).toThrow(
      'label content is claimed by argument and marker'
    )
  })

  it('rejects a marker carrying its own SDK call', () => {
    const called = {
      ...sidedMarker,
      host: { ...sidedMarker.host, arguments: { title: 'side' } },
    }
    expect(() => emitSided([sidedHost, called])).toThrow(
      'carries config for its parent'
    )
  })
})
