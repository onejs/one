import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { controls } from '../codegen/controlCatalog'
import { containerComponents, zStackAlignments } from '../codegen/emitContainers'
import { Swift } from '../src/unsupported'

const root = fileURLToPath(new URL('..', import.meta.url))
const read = (path: string) => readFileSync(root + path, 'utf8')
const metadata = JSON.parse(read('package.json'))
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

  // the generator writes this list itself, so a component whose view is missing mounts as
  // an unimplemented component and nothing before the running app says so. a view is
  // written in the file named after it unless it is one half of a pair, as Tab is of Tabs,
  // so the check is for the implementation rather than for a path.
  it('implements a view for every registered component', () => {
    const implementations = ['ios', 'ios/Generated']
      .flatMap((directory) =>
        readdirSync(root + directory).map((file) => `${directory}/${file}`)
      )
      .filter((path) => path.endsWith('.mm'))
      .map(read)
      .join('\n')
    for (const provider of Object.values<string>(
      metadata.codegenConfig.ios.componentProvider
    ))
      // the boundary keeps Tabs from answering for Tab.
      expect(new RegExp(`@implementation ${provider}\\b`).test(implementations), provider).toBe(
        true
      )
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

  // a SwiftUI stack maps the alignment by name, so a value with no case falls through to
  // the default and the stack lands somewhere other than what the props asked for.
  it('maps every ZStack alignment the props accept', () => {
    const source = read('ios/OneNativeZStackView.swift')
    for (const alignment of zStackAlignments)
      expect(source.includes(`case "${alignment}":`), alignment).toBe(true)
  })
})

// a control field reaches Swift as a parameter of its generated configure method, so one
// that is missing there is a prop that does nothing at all.
describe('control fields', () => {
  it('generates a configure parameter for every field', () => {
    for (const control of controls) {
      const signature = read(
        `ios/Generated/OneNative${control.name}View.swift`
      ).match(/public func configure\(([^)]*)\)/)
      expect(signature, control.name).toBeTruthy()
      for (const [field, spec] of Object.entries(control.fields))
        if (spec.type !== 'objects')
          expect(signature?.[1], `${control.name}.${field}`).toContain(`${field}:`)
    }
  })
})
