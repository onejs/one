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

    expect(
      JSON.parse(encodeWidgetView(createElement(Progress, { value: '2 of 3' })))
    ).toEqual({
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
    expect(
      JSON.parse(
        encodeActivityView({
          lockScreen: text,
          compactTrailing: text,
          expandedBottom: text,
        })
      )
    ).toEqual({
      lockScreen: { type: 'text', text: 'Ready' },
      compactLeading: null,
      compactTrailing: { type: 'text', text: 'Ready' },
      minimal: null,
      expandedLeading: null,
      expandedTrailing: null,
      expandedBottom: { type: 'text', text: 'Ready' },
    })
    expect(() => encodeWidgetView(createElement('View'))).toThrow(/WidgetUI primitives/)
    expect(() =>
      encodeActivityView({
        lockScreen: createElement(WidgetUI.Text, null, 'x'.repeat(4000)),
      })
    ).toThrow(/3500 UTF-8 bytes/)
  })

  test('encodes symbols, shapes, progress, links, and layered layout', () => {
    const view = createElement(
      WidgetUI.ZStack,
      { style: { alignment: 'center', width: 150, height: 150 } },
      createElement(WidgetUI.RoundedRectangle, {
        fill: '#224466',
        cornerRadius: 16,
        style: { width: 150, height: 150 },
      }),
      createElement(
        WidgetUI.VStack,
        { style: { spacing: 6 } },
        createElement(WidgetUI.Image, { systemName: 'shippingbox.fill' }),
        createElement(WidgetUI.Progress, { value: 2, total: 3 }),
        createElement(WidgetUI.Gauge, { value: 2, total: 3 }),
        createElement(WidgetUI.Circle, {
          fill: '#FFFFFF',
          style: { width: 8, height: 8 },
        }),
        createElement(WidgetUI.Rectangle, { fill: '#FFFFFF', style: { height: 1 } }),
        createElement(WidgetUI.Divider),
        createElement(WidgetUI.Link, { url: 'onebasic://order/42' }, 'Open order')
      )
    )
    const encoded = JSON.parse(encodeWidgetView(view))
    expect(encoded).toMatchObject({
      type: 'zstack',
      style: { alignment: 'center', width: 150, height: 150 },
      children: [
        { type: 'rounded-rectangle', fill: '#224466', cornerRadius: 16 },
        {
          type: 'vstack',
          children: [
            { type: 'image', systemName: 'shippingbox.fill' },
            { type: 'progress', value: 2, total: 3 },
            { type: 'gauge', value: 2, total: 3 },
            { type: 'circle', fill: '#FFFFFF' },
            { type: 'rectangle', fill: '#FFFFFF' },
            { type: 'divider' },
            {
              type: 'link',
              url: 'onebasic://order/42',
              children: [{ type: 'text', text: 'Open order' }],
            },
          ],
        },
      ],
    })
    expect(() => encodeWidgetView(createElement(WidgetUI.Image, {} as any))).toThrow(
      /systemName/
    )
    expect(() =>
      encodeWidgetView(createElement(WidgetUI.Progress, { value: NaN }))
    ).toThrow(/finite/)
    expect(() =>
      encodeWidgetView(createElement(WidgetUI.Link, { url: '/relative' }))
    ).toThrow(/absolute/)
  })

  test('renders conditional branches like React instead of throwing', () => {
    function Maybe({ show }: { show: boolean }) {
      if (!show) return null
      return createElement(WidgetUI.Text, null, 'shown')
    }
    function Rows() {
      return [
        createElement(WidgetUI.Text, { key: 'a' }, 'a'),
        createElement(WidgetUI.Text, { key: 'b' }, 'b'),
      ] as any
    }
    expect(
      JSON.parse(
        encodeWidgetView(
          createElement(
            WidgetUI.VStack,
            null,
            createElement(Maybe, { show: false }),
            createElement(Rows, null),
            false,
            createElement(WidgetUI.Text, null, 'kept')
          )
        )
      )
    ).toEqual({
      type: 'vstack',
      children: [
        {
          type: 'vstack',
          children: [
            { type: 'text', text: 'a' },
            { type: 'text', text: 'b' },
          ],
        },
        { type: 'text', text: 'kept' },
      ],
    })
    expect(() => encodeWidgetView(null)).toThrow(/WidgetUI root/)
    expect(() =>
      encodeActivityView({
        lockScreen: createElement(Maybe, { show: false }),
      })
    ).toThrow(/lockScreen/)
  })

  test('rejects style values the Swift decoder cannot read', () => {
    const text = (style: any) => createElement(WidgetUI.Text, { style }, 'x')
    expect(() => encodeWidgetView(text({ color: 'red' }))).toThrow(/six-digit hex/)
    expect(() => encodeWidgetView(text({ backgroundColor: '#FFF' }))).toThrow(
      /six-digit hex/
    )
    expect(() =>
      encodeWidgetView(createElement(WidgetUI.Circle, { fill: 'white' }))
    ).toThrow(/six-digit hex/)
    expect(() => encodeWidgetView(text({ lineLimit: 2.5 }))).toThrow(/integer/)
    expect(() => encodeWidgetView(text({ fontSize: '16' }))).toThrow(/must be a number/)
    expect(() => encodeWidgetView(text({ fontWeight: 600 as any }))).toThrow(
      /must be a string/
    )
    expect(() => encodeWidgetView(text('bold' as any))).toThrow(/must be an object/)
  })
})
