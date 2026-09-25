import { describe, expect, it } from 'vitest'
import { deriveLeafSwift } from '../codegen/derive'
import { selectEnumModifier, type Declaration } from '../codegen/inventory'
import type { Control } from '../codegen/controlTypes'
import { leafControls } from '../codegen/leafCatalog'
import { formControls } from '../codegen/formCatalog'

const declaration = (overrides: Partial<Declaration> = {}): Declaration => ({
  module: 'SwiftUI',
  owner: 'SwiftUICore.View',
  kind: 'func',
  name: 'toggleStyle',
  attributes: [],
  parameters: [],
  line: 1,
  ...overrides,
})

// a style modifier overload, the shape the SDK spells `buttonStyle(_:)` and
// `toggleStyle(_:)` in.
const styleModifier = (name: string, enumType: string) =>
  declaration({
    name,
    parameters: [{ label: '_', name: 'style', type: 'S' }],
    requirements: [`S: SwiftUI.${enumType}`],
  })

const valueModifier = (name: string, type: string) =>
  declaration({
    name,
    parameters: [{ label: '_', name: 'value', type }],
  })

const byName = (controls: Control[], name: string) => {
  const control = controls.find((c) => c.name === name)
  if (!control) throw new Error(`missing control ${name}`)
  return control
}

const enumFieldsOf = (control: Control) =>
  Object.entries(control.fields).flatMap(([field, spec]) =>
    spec.enum ? [{ field, enum: spec.enum }] : []
  )

// the constructor fixture is mechanical (the generator already proves the recipe
// selector exists in the real SDK); only the modifier overloads are hand-built.
const inventoryFor = (control: Control, modifiers: Declaration[] = []) => [
  declaration({
    module: 'SwiftUI',
    owner: control.constructors[0].type,
    kind: 'init',
    name: 'init',
    parameters: control.constructors[0].parameters.map((p) => ({ ...p, name: p.label })),
  }),
  ...modifiers,
]

describe('generic leaf emitter', () => {
  // Toggle is not listed: its systemImage branch takes the SDK's
  // Toggle(_:systemImage:isOn:) instead of the label closure, so its body is
  // hand-written like Button's rather than derived from one constructor.
  it.each([
    ['Text', leafControls, []],
    ['Label', leafControls, []],
    ['Gauge', leafControls, [styleModifier('gaugeStyle', 'GaugeStyle')]],
    ['Stepper', formControls, []],
  ] as const)('reproduces the hand-written %s body byte for byte', (name, catalog, modifiers) => {
    const control = byName([...catalog], name)
    if (!control.leaf) throw new Error(`missing leaf recipe for ${name}`)
    expect(
      deriveLeafSwift(
        inventoryFor(control, [...modifiers]),
        control.leaf,
        enumFieldsOf(control)
      )
    ).toBe(control.swift)
  })

  it('consumes an enum constructor arg instead of chaining it as a modifier', () => {
    const parameters = [{ label: 'axis', type: 'SwiftUICore.Axis' }]
    const body = deriveLeafSwift(
      [
        declaration({
          module: 'SwiftUI',
          owner: 'FakeView',
          kind: 'init',
          name: 'init',
          parameters: parameters.map((p) => ({ ...p, name: p.label })),
        }),
      ],
      { constructor: { type: 'FakeView', parameters }, args: [{ label: 'axis', enum: 'Axis', field: 'axis' }] },
      [{ field: 'axis', enum: 'Axis' }]
    )
    expect(body).toBe('FakeView(axis: OneNativeGenerated.axis(model.axis))')
  })

  it('matches repeated unlabeled arguments by position', () => {
    const parameters = [
      { label: '_', type: 'SwiftUICore.LocalizedStringKey' },
      { label: '_', type: 'Swift.Bool' },
    ]
    expect(
      deriveLeafSwift(
        [
          declaration({
            module: 'SwiftUI',
            owner: 'FakeView',
            kind: 'init',
            name: 'init',
            parameters: parameters.map((parameter, index) => ({
              ...parameter,
              name: `value${index}`,
            })),
          }),
        ],
        {
          constructor: { type: 'FakeView', parameters },
          args: [
            { label: '_', localizedKey: 'label' },
            { label: '_', field: 'enabled' },
          ],
        },
        []
      )
    ).toBe('FakeView(LocalizedStringKey(model.label), model.enabled)')
  })

  it('rejects arg lists that do not match the signature', () => {
    const control = byName([...leafControls], 'Text')
    const inventory = inventoryFor(control)
    const constructor = control.constructors[0]
    expect(() => deriveLeafSwift(inventory, { constructor, args: [] }, [])).toThrow(
      '0 args for 1 parameters'
    )
    expect(() =>
      deriveLeafSwift(
        inventory,
        { constructor, args: [{ label: 'content', field: 'text' }] },
        []
      )
    ).toThrow('argument 1 is content, not verbatim')
    expect(() =>
      deriveLeafSwift(
        inventory,
        { constructor, args: [{ label: 'verbatim', binding: 'controlled' }] },
        []
      )
    ).toThrow('verbatim is Swift.String, not a Binding')
  })

  it('requires a discarded closure to be last', () => {
    const control = byName([...formControls], 'Stepper')
    expect(() =>
      deriveLeafSwift(
        inventoryFor(control),
        {
          constructor: control.constructors[0],
          args: [
            { label: 'value', binding: 'controlled' },
            { label: 'in', range: ['minimumValue', 'maximumValue'] },
            { label: 'step', field: 'step' },
            { label: 'onEditingChanged', discard: true },
            { label: 'label', text: 'label' },
          ],
        },
        []
      )
    ).toThrow('a discarded closure must be last')
  })
})

describe('selectEnumModifier', () => {
  it('resolves a style enum through its generic constraint', () => {
    const inventory = [
      styleModifier('buttonStyle', 'ButtonStyle'),
      styleModifier('buttonStyle', 'PrimitiveButtonStyle'),
    ]
    expect(selectEnumModifier(inventory, 'PrimitiveButtonStyle').name).toBe('buttonStyle')
    expect(selectEnumModifier(inventory, 'ButtonStyle').name).toBe('buttonStyle')
  })

  it('resolves a value enum through its single parameter', () => {
    expect(
      selectEnumModifier([valueModifier('menuOrder', 'SwiftUI.MenuOrder')], 'MenuOrder').name
    ).toBe('menuOrder')
    expect(selectEnumModifier([valueModifier('axis', 'Axis?')], 'Axis').name).toBe('axis')
    expect(
      selectEnumModifier([valueModifier('imageScale', 'SwiftUI.Image.Scale')], 'ImageScale')
        .name
    ).toBe('imageScale')
  })

  it('resolves a soft-deprecated modifier the SDK still ships', () => {
    const deprecated = styleModifier('toggleStyle', 'ToggleStyle')
    deprecated.attributes = ['@available(iOS, introduced: 13.0, deprecated: 27.0)']
    expect(selectEnumModifier([deprecated], 'ToggleStyle').name).toBe('toggleStyle')
  })

  it('throws on ambiguity or absence instead of guessing', () => {
    expect(() =>
      selectEnumModifier(
        [valueModifier('first', 'SwiftUI.Duo'), valueModifier('second', 'SwiftUI.Duo')],
        'Duo'
      )
    ).toThrow('expected one name, found 2 (first, second)')
    expect(() => selectEnumModifier([], 'Missing')).toThrow(
      'expected one name, found 0'
    )
  })

  it('ignores overloads that do not qualify', () => {
    const inventory = [
      // wrong owner, wrong kind, unavailable, wrong arity, labeled parameter
      declaration({ owner: 'SwiftUI.Button', parameters: [] }),
      declaration({ kind: 'init', name: 'init' }),
      declaration({ attributes: ['@available(*, unavailable)'] }),
      declaration({
        name: 'two',
        parameters: [
          { label: '_', name: 'a', type: 'S' },
          { label: '_', name: 'b', type: 'S' },
        ],
        requirements: ['S: SwiftUI.ToggleStyle'],
      }),
      declaration({
        name: 'labeled',
        parameters: [{ label: 'style', name: 'style', type: 'S' }],
        requirements: ['S: SwiftUI.ToggleStyle'],
      }),
      styleModifier('toggleStyle', 'ToggleStyle'),
    ]
    expect(selectEnumModifier(inventory, 'ToggleStyle').name).toBe('toggleStyle')
  })
})
