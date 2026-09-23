import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { controls } from '../codegen/controlCatalog'
import { containerComponents } from '../codegen/emitContainers'
import { swiftUIValues } from '../src/generated/swiftui'
import { Swift } from '../src/unsupported'

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

let Containers: typeof import('../src/Containers.native')

beforeAll(async () => {
  Containers = await import('../src/Containers.native')
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
// catalog and the generated schema must agree field for field.
describe('control fields', () => {
  it('emits every catalog field as a schema prop', () => {
    for (const control of controls) {
      const entry = schema.components.find(
        (candidate: { publicName: string }) => candidate.publicName === control.name
      )
      expect(entry, control.name).toBeTruthy()
      for (const [field, spec] of Object.entries(control.fields))
        if ((spec as { type: string }).type !== 'objects')
          expect(entry.props, `${control.name}.${field}`).toHaveProperty(field)
    }
  })
})

// controlSize is a SwiftUI environment override on Host and Form, never a Button prop.
describe('environment control size', () => {
  it('declares controlSize on Host and Form', () => {
    expect(component('Host').props).toMatchObject({
      controlSize: { type: 'string' },
    })
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
    // Host renders the shared stack wrapper, so the host element is one level down.
    const host = (props: object) => {
      const element = render(Containers.Host, props)
      return element.type(element.props)
    }
    expect(host({ children: null, controlSize: 'small' }).props).toMatchObject({
      controlSize: 'small',
    })
    expect(render(Containers.Form, { children: null }).props.controlSize).toBe('')
  })

  it('rejects a size SwiftUI never defined', () => {
    const host = (props: object) => {
      const element = render(Containers.Host, props)
      return () => element.type(element.props)
    }
    expect(() => host({ children: null, controlSize: 'huge' })()).toThrow(
      'Unknown SwiftUI ControlSize: huge'
    )
    expect(() =>
      render(Containers.Form, { children: null, controlSize: 'huge' })
    ).toThrow('Unknown SwiftUI ControlSize: huge')
  })
})
