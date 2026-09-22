import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { shapeControls } from '../codegen/shapeCatalog'
import { glassEffectShapes } from '../src/generated/controlTypes'

// schema.json is the published contract every One Native component declares: it is the payload
// React Native's codegen and the native views agree on. a prop the catalog drops lands here as a
// missing binding React can never send, so this is where a shape prop change is asserted.
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '26.4' },
}))
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', () => ({
  default: (name: string) => ({ __component: name }),
}))

let Controls: typeof import('../src/generated/Controls.native')
let Unsupported: typeof import('../src/generated/unsupportedControls').unsupportedControls

beforeAll(async () => {
  Controls = await import('../src/generated/Controls.native')
  Unsupported = (await import('../src/generated/unsupportedControls')).unsupportedControls
})

const render = (component: (props: never) => any, props: object): any =>
  component(props as never)

const schema = JSON.parse(readFileSync(new URL('../schema.json', import.meta.url), 'utf8'))
const component = (publicName: string) =>
  schema.components.find((entry: { publicName: string }) => entry.publicName === publicName)

const shapeNames = ['Circle', 'Capsule', 'Rectangle', 'RoundedRectangle', 'Ellipse']

describe('shapes', () => {
  it('declares all five shapes with an optional color fill', () => {
    for (const name of shapeNames)
      expect(component(name), name).toMatchObject({
        props: { fill: { type: 'ColorValue' } },
        layout: { kind: 'fill' },
        slots: [],
      })
  })

  it('takes a corner radius on the rounded rectangle only', () => {
    expect(component('RoundedRectangle').props).toMatchObject({
      cornerRadius: { type: 'Double' },
    })
    for (const name of ['Circle', 'Capsule', 'Rectangle', 'Ellipse'])
      expect(component(name).props, name).not.toHaveProperty('cornerRadius')
  })

  it('matches the glass shape names, Circle first', () => {
    expect(shapeControls.map((control) => control.name)).toEqual(shapeNames)
    for (const control of shapeControls) {
      const shape = control.name[0].toLowerCase() + control.name.slice(1)
      expect(glassEffectShapes, control.name).toContain(shape)
    }
  })

  it('throws for every shape without the native build', () => {
    for (const name of shapeNames)
      expect(
        () => (Unsupported as Record<string, (props: object) => unknown>)[name]({}),
        name
      ).toThrow(`Swift.${name} requires an iOS native build`)
  })

  it('passes the fill through to the native view', () => {
    expect(render(Controls.Circle, { fill: 'red' }).props).toMatchObject({
      fill: 'red',
    })
    expect(render(Controls.Circle, {}).props.fill).toBeUndefined()
  })

  it('rejects a corner radius that is not a non-negative number', () => {
    expect(() => render(Controls.RoundedRectangle, { cornerRadius: -1 })).toThrow(
      'RoundedRectangle cornerRadius must be a non-negative number'
    )
    expect(
      render(Controls.RoundedRectangle, { cornerRadius: 8 }).props
    ).toMatchObject({ cornerRadius: 8 })
  })
})
