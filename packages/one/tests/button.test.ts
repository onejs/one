import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// schema.json is the published contract every One Native component declares: it is the payload
// React Native's codegen and the native views agree on. a prop the catalog drops lands here as a
// missing binding React can never send, so this is where a Button prop change is asserted.
const schema = JSON.parse(readFileSync(new URL('../schema.json', import.meta.url), 'utf8'))
const component = (publicName: string) =>
  schema.components.find((entry: { publicName: string }) => entry.publicName === publicName)

describe('button subtitle', () => {
  it('carries the subtitle as a string prop', () => {
    expect(component('Button').props).toMatchObject({
      subtitle: { type: 'string' },
    })
  })

  it('leaves the label, image, and press contract alone', () => {
    expect(component('Button')).toMatchObject({
      name: 'OneNativeButton',
      props: {
        label: { type: 'string' },
        systemImage: { type: 'string' },
        buttonRole: { type: 'string' },
        buttonStyle: { type: 'string' },
        disclosureIndicator: { type: 'boolean' },
      },
      events: {
        onNativeButtonPress: {
          eventCount: { type: 'Int32' },
        },
      },
    })
  })
})

describe('button children', () => {
  it('takes composed children as the label view', () => {
    expect(component('Button').slots).toEqual([
      {
        name: 'content',
        content: 'one-native',
        cardinality: 'many',
        layout: 'composed',
      },
    ])
  })

  it('keeps the press action and the measured layout', () => {
    expect(component('Button')).toMatchObject({
      actions: [{ publicProp: 'onPress', event: 'onNativeButtonPress' }],
      layout: { kind: 'measured' },
      interfaceOnly: true,
    })
  })

  it('leaves Text text-only', () => {
    expect(component('Text').slots).toEqual([])
  })
})
