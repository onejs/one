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
