import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { swiftUIValues } from '../src/generated/swiftui'

// schema.json is the published contract every One Native component declares: it is the payload
// React Native's codegen and the native views agree on. a prop the catalog drops lands here as a
// missing binding React can never send, so this is where the controlSize contract is asserted.
const schema = JSON.parse(
  readFileSync(new URL('../schema.json', import.meta.url), 'utf8')
)
const component = (publicName: string) =>
  schema.components.find(
    (entry: { publicName: string }) => entry.publicName === publicName
  )

describe('controlSize', () => {
  it('binds the five sizes SwiftUI documents, gated by version', () => {
    expect(Object.keys(swiftUIValues.ControlSize).sort()).toEqual(
      ['mini', 'small', 'regular', 'large', 'extraLarge'].sort()
    )
    expect(swiftUIValues.ControlSize.extraLarge).toBe(17)
  })

  it('carries controlSize as an enum string prop on the seven controls', () => {
    for (const name of [
      'Button',
      'Picker',
      'Toggle',
      'Slider',
      'Stepper',
      'ProgressView',
      'Gauge',
    ]) {
      expect(component(name).props, name).toMatchObject({
        controlSize: { type: 'string', enum: 'ControlSize' },
      })
    }
  })
})
