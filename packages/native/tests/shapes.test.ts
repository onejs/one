import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// schema.json is the published contract every One Native component declares: it is the payload
// React Native's codegen and the native views agree on. a prop the catalog drops lands here as a
// missing binding React can never send, so this is where the shape contract is asserted.
const schema = JSON.parse(
  readFileSync(new URL('../schema.json', import.meta.url), 'utf8')
)
const metadata = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
)
const component = (publicName: string) =>
  schema.components.find(
    (entry: { publicName: string }) => entry.publicName === publicName
  )

const shapes = ['Circle', 'Capsule', 'Rectangle', 'RoundedRectangle', 'Ellipse']

describe('shapes', () => {
  it('carries fill, stroke, and lineWidth on all five shapes', () => {
    for (const name of shapes) {
      expect(component(name).props, name).toMatchObject({
        fill: { type: 'ColorValue' },
        stroke: { type: 'ColorValue' },
        lineWidth: { type: 'Double' },
      })
    }
    expect(component('RoundedRectangle').props).toMatchObject({
      cornerRadius: { type: 'Double' },
    })
  })

  it('measures like the other leaves', () => {
    for (const name of shapes) {
      expect(component(name), name).toMatchObject({
        layout: { kind: 'measured' },
        interfaceOnly: true,
      })
    }
  })

  it('registers a component view for every shape', () => {
    for (const name of shapes.map((shape) => `OneNative${shape}`))
      expect(metadata.codegenConfig.ios.componentProvider[name]).toBe(
        `${name}ComponentView`
      )
  })
})
