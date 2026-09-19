import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { controls } from '../codegen/controlCatalog'
import { containerComponents } from '../codegen/emitContainers'
import { Swift } from '../src/unsupported'

const root = fileURLToPath(new URL('..', import.meta.url))
const read = (path: string) => readFileSync(root + path, 'utf8')
const schema = JSON.parse(read('schema.json'))

// the non-iOS entry has to carry every container: a missing one is undefined at the call
// site, which React reads as a component type it cannot render.
describe('container surface', () => {
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
