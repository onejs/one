import { assertSwiftUIValue } from '../src/generated/swiftui'
import { describe, expect, it } from 'vitest'
import {
  available,
  ios,
  selectConstructor,
  selectModifier,
  type Declaration,
} from '../codegen/inventory'

const declaration = (overrides: Partial<Declaration> = {}): Declaration => ({
  module: 'SwiftUI',
  owner: 'Section',
  kind: 'init',
  name: 'init',
  attributes: [],
  parameters: [],
  line: 1,
  ...overrides,
})

const contentHeader = (headerType: string): Declaration['parameters'] => [
  { label: 'content', name: 'content', type: '() -> Content' },
  { label: 'header', name: 'header', type: headerType },
]

describe('ios availability', () => {
  it('parses short-form iOS versions', () => {
    expect(ios(declaration({ attributes: ['@available(iOS 16.4, *)'] }))).toBe(16.4)
    expect(
      ios(
        declaration({
          attributes: [
            '@available(iOS 18.0, macOS 15.0, tvOS 18.0, watchOS 11.0, visionOS 2.0, *)',
          ],
        })
      )
    ).toBe(18)
  })

  it('parses long-form iOS introduced versions', () => {
    expect(
      ios(
        declaration({
          attributes: [
            '@available(iOS, introduced: 13.0, deprecated: 100000.0, renamed: "accessibilityValue(_:)")',
          ],
        })
      )
    ).toBe(13)
    expect(
      ios(
        declaration({
          attributes: ['@available(iOS, deprecated, introduced: 13.0)'],
        })
      )
    ).toBe(13)
  })

  it('takes the max iOS version across inherited attributes', () => {
    expect(
      ios(
        declaration({
          attributes: ['@available(iOS 15.0, *)', '@available(iOS 16.4, *)'],
        })
      )
    ).toBe(16.4)
    expect(
      ios(
        declaration({
          attributes: [
            '@available(iOS 16.4, *)',
            '@available(iOS, introduced: 13.0, deprecated: 100000.0)',
          ],
        })
      )
    ).toBe(16.4)
  })

  it('ignores other-platform versions', () => {
    expect(ios(declaration({ attributes: ['@available(macOS 14.0, *)'] }))).toBe(0)
    expect(
      ios(
        declaration({
          attributes: [
            '@available(macOS, introduced: 10.15, deprecated: 100000.0)',
            '@available(watchOS, introduced: 6, deprecated: 100000.0)',
          ],
        })
      )
    ).toBe(0)
  })

  it('throws on an unrecognized iOS introduction instead of scoring 0', () => {
    expect(() =>
      ios(declaration({ attributes: ['@available(iOS, introduced: later)'] }))
    ).toThrow(/unrecognized iOS availability/)
    expect(() => ios(declaration({ attributes: ['@available(iOS potato, *)'] }))).toThrow(
      /unrecognized iOS availability/
    )
    expect(() => ios(declaration({ attributes: ['@available(iOS)'] }))).toThrow(
      /unrecognized iOS availability/
    )
  })
})

describe('available', () => {
  it('keeps declarations without iOS or wildcard restrictions', () => {
    expect(available(declaration())).toBe(true)
    expect(available(declaration({ attributes: ['@available(iOS 16.4, *)'] }))).toBe(true)
    expect(
      available(
        declaration({
          attributes: [
            '@available(macOS, introduced: 10.15, deprecated: 100000.0, message: "Use `Menu` instead.")',
          ],
        })
      )
    ).toBe(true)
    expect(
      available(declaration({ attributes: ['@available(macOS, unavailable)'] }))
    ).toBe(true)
    expect(
      available(declaration({ attributes: ['@available(tvOS, deprecated: 16.0)'] }))
    ).toBe(true)
  })

  it('excludes iOS and wildcard unavailable, SPI, and deprecated declarations', () => {
    expect(available(declaration({ attributes: ['@available(iOS, unavailable)'] }))).toBe(
      false
    )
    expect(available(declaration({ attributes: ['@available(*, unavailable)'] }))).toBe(
      false
    )
    expect(available(declaration({ attributes: ['@_spi(Experimental)'] }))).toBe(false)
    expect(
      available(
        declaration({
          attributes: ['@available(iOS, introduced: 13.0, deprecated: 15.0)'],
        })
      )
    ).toBe(false)
    expect(
      available(
        declaration({
          attributes: [
            '@available(iOS, introduced: 13.0, deprecated: 100000.0, renamed: "accessibilityValue(_:)")',
          ],
        })
      )
    ).toBe(false)
    expect(
      available(
        declaration({
          attributes: [
            '@available(*, deprecated, renamed: "fullScreenCover(isPresented:onDismiss:content:)")',
          ],
        })
      )
    ).toBe(false)
  })
})

describe('selectConstructor', () => {
  const parent = declaration({
    attributes: ['@available(iOS 13.0, *)'],
    parameters: contentHeader('() -> Parent'),
  })
  const header = declaration({
    attributes: ['@available(iOS 16.0, *)'],
    parameters: contentHeader('() -> H'),
    line: 2,
  })

  it('matches the full ordered label and type list', () => {
    expect(
      selectConstructor([parent, header], {
        type: 'Section',
        parameters: [
          { label: 'content', type: '() -> Content' },
          { label: 'header', type: '() -> H' },
        ],
      })
    ).toBe(header)
  })

  it('throws when the exact signature is missing', () => {
    expect(() =>
      selectConstructor([parent], {
        type: 'Section',
        parameters: [
          { label: 'content', type: '() -> Content' },
          { label: 'header', type: '() -> H' },
        ],
      })
    ).toThrow(
      'SDK constructor signature changed: Section(content: () -> Content, header: () -> H)'
    )
  })

  it('throws on ambiguous exact signatures instead of sorting by iOS version', () => {
    const first = declaration({
      owner: 'Tab',
      attributes: ['@available(iOS 18.0, *)'],
      parameters: [
        { label: 'value', name: 'value', type: 'Value' },
        { label: 'role', name: 'role', type: 'TabRole?' },
        { label: 'content', name: 'content', type: '() -> Content' },
        { label: 'label', name: 'label', type: '() -> Label' },
      ],
    })
    const second = declaration({
      owner: 'SwiftUI.Tab',
      attributes: ['@available(iOS 13.0, *)'],
      parameters: first.parameters,
      line: 2,
    })
    expect(() =>
      selectConstructor([first, second], {
        type: 'Tab',
        parameters: first.parameters,
      })
    ).toThrow(
      'ambiguous SDK constructor: Tab(value: Value, role: TabRole?, content: () -> Content, label: () -> Label)'
    )
  })
})

describe('modifier overloads', () => {
  it('distinguishes identical parameter types by generic constraints', () => {
    const common = {
      owner: 'SwiftUICore.View',
      kind: 'func',
      name: 'buttonStyle',
      parameters: [{ label: '_', name: 'style', type: 'S' }],
    }
    const button = declaration({ ...common, requirements: ['S : SwiftUI.ButtonStyle'] })
    const primitive = declaration({
      ...common,
      requirements: ['S : SwiftUI.PrimitiveButtonStyle'],
    })
    const selector = {
      name: 'buttonStyle',
      parameters: [{ label: '_', type: 'S' }],
      requirements: ['S:SwiftUI.ButtonStyle'],
    }
    expect(selectModifier([primitive, button], selector)).toBe(button)
    expect(() => selectModifier([primitive], selector)).toThrow('found 0')
    expect(() => selectModifier([button, button], selector)).toThrow('found 2')
  })
})

it('exposes Swift keyword identifiers without source escaping', () => {
  expect(() => assertSwiftUIValue('ToggleStyle', 'switch', 18)).not.toThrow()
  expect(() => assertSwiftUIValue('ToggleStyle', '`switch`', 18)).toThrow(
    'Unknown SwiftUI'
  )
})
