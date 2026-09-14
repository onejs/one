import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// schema.json is the published contract every One Native component declares: it is the payload
// React Native's codegen and the native views agree on. a prop the catalog drops lands here as a
// missing binding React can never send, so this is where a Slider prop change is asserted.
const schema = JSON.parse(readFileSync(new URL('../schema.json', import.meta.url), 'utf8'))
const component = (publicName: string) =>
  schema.components.find((entry: { publicName: string }) => entry.publicName === publicName)

describe('slider value labels', () => {
  it('carries the leading and trailing label and image props as strings', () => {
    const slider = component('Slider')
    expect(slider.props).toMatchObject({
      minimumValueLabel: { type: 'string' },
      maximumValueLabel: { type: 'string' },
      minimumValueImage: { type: 'string' },
      maximumValueImage: { type: 'string' },
    })
  })

  it('leaves the controlled value, bounds, and event contract alone', () => {
    expect(component('Slider')).toMatchObject({
      name: 'OneNativeSlider',
      interfaceOnly: true,
      layout: { kind: 'measured' },
      controlled: { value: 'value', event: 'onNativeSliderValueChange' },
      props: {
        value: { type: 'Double' },
        acknowledgedEvent: { type: 'Int32' },
        revision: { type: 'Int32' },
        label: { type: 'string' },
        disabled: { type: 'boolean' },
        minimumValue: { type: 'Double' },
        maximumValue: { type: 'Double' },
        step: { type: 'Double' },
      },
      events: {
        onNativeSliderValueChange: {
          value: { type: 'Double' },
          eventCount: { type: 'Int32' },
          revision: { type: 'Int32' },
        },
      },
    })
  })
})
