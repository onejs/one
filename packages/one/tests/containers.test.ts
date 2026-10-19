import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { controls } from '../codegen/controlCatalog'
import { containerComponents } from '../codegen/emitContainers'
import { swiftUIValues } from '../src/platform/generated/swiftui'
import { Swift } from '../src/platform/unsupported'

// Host and Form are plain functions over the spec modules, so a test reads the element
// they build rather than mounting a native view.
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '26.4' },
  View: () => null,
  Text: () => null,
  Image: () => null,
  ScrollView: () => null,
  TextInput: () => null,
}))
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', () => ({
  default: (name: string) => ({ __component: name }),
}))

let Containers: typeof import('../src/platform/Containers.native')

beforeAll(async () => {
  Containers = await import('../src/platform/Containers.native')
})

const render = (component: (props: never) => any, props: object): any =>
  component(props as never)

const root = fileURLToPath(new URL('..', import.meta.url))
const read = (path: string) => readFileSync(root + path, 'utf8')
const schema = JSON.parse(read('schema.json'))
const component = (publicName: string) =>
  schema.components.find((entry: { publicName: string }) => entry.publicName === publicName)

// the non-iOS entry has to carry every container: a missing one is undefined at the call
// site, which React reads as a component type it cannot render.
describe('container surface', () => {
  it('sends a preference value from a generated child slot to React', () => {
    const onValue = vi.fn()
    const slot = render(Containers.ViewSlot, {
      name: 'overlayPreferenceValuePreferredColorScheme',
      options: { onValue },
      children: createElement(Containers.ViewSlot.Content, { children: null }),
    })
    expect(JSON.parse(slot.props.slotValues)).toEqual([])
    slot.props.onNativeSDKEvent({ nativeEvent: {
      name: 'overlayPreferenceValuePreferredColorScheme', value: '"dark"',
    } })
    expect(onValue).toHaveBeenCalledWith('dark')
    slot.props.onNativeSDKEvent({ nativeEvent: {
      name: 'overlayPreferenceValuePreferredColorScheme', value: 'null',
    } })
    expect(onValue).toHaveBeenCalledWith(null)
    expect(() => slot.props.onNativeSDKEvent({ nativeEvent: {
      name: 'overlayPreferenceValuePreferredColorScheme', value: '"orange"',
    } })).toThrow('invalid preference value')
  })

  it('passes a generated presentation binding through a child slot', () => {
    const onChange = vi.fn()
    const slot = render(Containers.ViewSlot, {
      name: 'sheet',
      options: { isPresented: { value: true, onChange } },
      children: createElement(Containers.ViewSlot.Content, { children: null }),
    })
    expect(JSON.parse(slot.props.slotValues)).toEqual(['true'])
    slot.props.onNativeSDKEvent({ nativeEvent: { name: 'sheet', value: 'false' } })
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('passes a generated string binding through a View slot and dispatches its update', () => {
    const onChange = vi.fn()
    const child = createElement(Containers.ViewSlot.Content, { children: null })
    const slot = render(Containers.ViewSlot, {
      name: 'searchScopesWithBindingString',
      options: { scope: { value: 'all', onChange } },
      children: child,
    })
    expect(JSON.parse(slot.props.slotValues)).toEqual(['all'])
    slot.props.onNativeSDKEvent({ nativeEvent: { name: 'searchScopesWithBindingString', value: 'favorites' } })
    expect(onChange).toHaveBeenCalledWith('favorites')
  })

  it('keeps omitted slot options null apart from zero and false', () => {
    const child = createElement(Containers.ViewSlot.Content, { children: null })
    const values = (name: string, options?: object) =>
      JSON.parse(
        render(Containers.ViewSlot, { name, options, children: child }).props.slotValues
      )
    expect(values('safeAreaInsetWithVerticalEdge', { edge: 'bottom' })).toEqual([
      'bottom',
      null,
      null,
    ])
    expect(values('safeAreaInsetWithVerticalEdge', { edge: 'bottom', spacing: 0 })).toEqual([
      'bottom',
      null,
      '0',
    ])
    expect(
      values('safeAreaInsetWithVerticalEdge', { edge: 'bottom', alignment: 'leading', spacing: 8 })
    ).toEqual(['bottom', 'leading', '8'])
    expect(values('swipeActions')).toEqual([null, null])
    expect(values('swipeActions', { allowsFullSwipe: false })).toEqual([null, 'false'])
    expect(() => values('safeAreaInsetWithVerticalEdge', {})).toThrow(
      'safeAreaInsetWithVerticalEdge.edge must be a declared SDK case'
    )
    expect(() =>
      values('safeAreaInsetWithVerticalEdge', { edge: 'bottom', alignment: 'diagonal' })
    ).toThrow('safeAreaInsetWithVerticalEdge.alignment must be a declared SDK case')
  })

  it('throws for every container without the native build', () => {
    // HStack and VStack are Host with the axis fixed, so they carry no component of their
    // own and the catalog does not list them.
    for (const name of [
      ...containerComponents.map((entry) => entry.publicName),
      'HStack',
      'VStack',
    ])
      expect(
        () => (Swift as Record<string, (props: object) => unknown>)[name]({}),
        name
      ).toThrow(`Swift.${name} requires an iOS native build`)
  })

  // a measured component pins its own height through Fabric state, which needs a shadow
  // node: RN codegen writes one for a control, a container's is written by hand.
  it('has a shadow node for every measured component', () => {
    for (const component of schema.components)
      if (component.layout?.kind === 'measured')
        expect(existsSync(`${root}cpp/${component.name}ShadowNode.h`), component.name).toBe(
          true
        )
  })

})

// a form in a sheet wraps its content instead of filling the screen, so sizing is a
// real native prop and the component measures through a hand-written shadow node.
describe('form sizing', () => {
  it('declares sizing and measures through a hand-written shadow node', () => {
    const form = schema.components.find(
      (entry: { publicName: string }) => entry.publicName === 'Form'
    )
    expect(form).toMatchObject({
      name: 'OneNativeForm',
      interfaceOnly: true,
      layout: { kind: 'measured' },
      props: {
        sizing: { type: 'string' },
      },
    })
  })
})

// a control field the emitted schema drops is a prop that does nothing at all, so the
// catalog and the generated schema must agree field for field, except public-only
// fields whose derived scalars carry them across the wire instead.
describe('control fields', () => {
  it('emits every catalog field as a schema prop', () => {
    for (const control of controls) {
      const entry = schema.components.find(
        (candidate: { publicName: string }) => candidate.publicName === control.name
      )
      expect(entry, control.name).toBeTruthy()
      for (const [field, spec] of Object.entries(control.fields)) {
        const flags = spec as { type: string; noNative?: true }
        if (flags.type === 'objects' || flags.noNative) continue
        expect(entry.props, `${control.name}.${field}`).toHaveProperty(field)
      }
    }
  })

  it('carries each public-only field through derived native scalars', () => {
    for (const control of controls) {
      const fields = Object.entries(control.fields) as [
        string,
        { noNative?: true; derived?: boolean },
      ][]
      if (!fields.some(([, spec]) => spec.noNative)) continue
      const scalars = fields.filter(([, spec]) => spec.derived).map(([field]) => field)
      expect(scalars, `${control.name} derived scalars`).not.toHaveLength(0)
    }
  })
})

// controlSize is a SwiftUI environment override on Form, and a swiftStyle modifier on a
// stack, never a Button prop.
describe('environment control size', () => {
  it('declares controlSize on Form', () => {
    expect(component('Form').props).toMatchObject({
      controlSize: { type: 'string' },
    })
  })

  it('lists the five SwiftUI control sizes', () => {
    expect(swiftUIValues.ControlSize).toMatchObject({
      mini: 15,
      small: 15,
      regular: 15,
      large: 15,
      extraLarge: 17,
    })
  })

  it('passes controlSize through to the native view, empty by default', () => {
    expect(render(Containers.Form, { children: null, controlSize: 'small' }).props.controlSize).toBe(
      'small'
    )
    expect(render(Containers.Form, { children: null }).props.controlSize).toBe('')
  })

  it('rejects a size SwiftUI never defined', () => {
    expect(() =>
      render(Containers.Form, { children: null, controlSize: 'huge' })
    ).toThrow('Unknown SwiftUI ControlSize: huge')
  })
})
