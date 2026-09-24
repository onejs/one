import { createElement } from 'react'
import { describe, expect, test } from 'vitest'
import { WidgetUI, encodeActivityView, encodeWidgetView } from './view'

describe('WidgetUI payload', () => {
  test('serializes nested JSX and pure components for the SwiftUI contract', () => {
    function Progress({ value }: { value: string }) {
      return createElement(
        WidgetUI.HStack,
        { style: { spacing: 4 } },
        createElement(WidgetUI.Text, { style: { fontWeight: 'bold' } }, 'Order'),
        createElement(WidgetUI.Spacer),
        createElement(WidgetUI.Text, null, value)
      )
    }

    expect(JSON.parse(encodeWidgetView(createElement(Progress, { value: '2 of 3' })))).toEqual({
      type: 'hstack',
      style: { spacing: 4 },
      children: [
        { type: 'text', text: 'Order', style: { fontWeight: 'bold' } },
        { type: 'spacer' },
        { type: 'text', text: '2 of 3' },
      ],
    })
  })

  test('encodes the ActivityKit layout slots and rejects unsupported views', () => {
    const text = createElement(WidgetUI.Text, null, 'Ready')
    expect(JSON.parse(encodeActivityView({ lockScreen: text, compactTrailing: text }))).toEqual({
      lockScreen: { type: 'text', text: 'Ready' },
      compactLeading: null,
      compactTrailing: { type: 'text', text: 'Ready' },
      minimal: null,
    })
    expect(() => encodeWidgetView(createElement('View'))).toThrow(/WidgetUI primitives/)
    expect(() =>
      encodeActivityView({ lockScreen: createElement(WidgetUI.Text, null, 'x'.repeat(4000)) })
    ).toThrow(/3500 UTF-8 bytes/)
  })
})
