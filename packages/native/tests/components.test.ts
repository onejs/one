import { Fragment, createElement } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import {
  Image as RNImage,
  ScrollView as RNScrollView,
  Text as RNText,
  TextInput as RNTextInput,
  View as RNView,
} from 'react-native'

// each container is a plain function over the spec modules, so a test reads the element it
// builds rather than mounting a native view. the spec modules and Platform are the only
// react-native surface involved, and a mock only reaches an import that happens after it
// is registered, so both are set up here and the wrappers are imported below.
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '26.4' },
  // stable identities for the child-denylist proof below.
  View: () => null,
  Text: () => null,
  Image: () => null,
  ScrollView: () => null,
  TextInput: () => null,
  // later entries win, like the real flatten; registered ids never appear here.
  StyleSheet: {
    flatten: (function flatten(
      style: unknown,
      into: Record<string, unknown> = {}
    ): Record<string, unknown> {
      if (Array.isArray(style)) style.forEach((entry) => flatten(entry, into))
      else if (style && typeof style === 'object') Object.assign(into, style)
      return into
    }) as (style: unknown) => Record<string, unknown>,
  },
}))
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', () => ({
  default: (name: string) => ({ __component: name }),
}))

let Containers: typeof import('../src/Containers.native')
let Button: typeof import('../src/generated/Controls.native').Button
let Popover: typeof import('../src/Popover.native').Popover

beforeAll(async () => {
  Containers = await import('../src/Containers.native')
  Button = (await import('../src/generated/Controls.native')).Button
  Popover = (await import('../src/Popover.native')).Popover
})

const render = (component: (props: never) => any, props: object): any =>
  component(props as never)

// a stack renders the host wrapper with its axis fixed, so the host is one level further
// down: that wrapper's type is a function here, exactly as it is in a real tree.
const host = (stack: (props: never) => any, props: object) => {
  const element = render(stack, props)
  return element.type(element.props)
}

describe('stacks', () => {
  it('fixes the axis and passes everything else to the host', () => {
    expect(
      host(Containers.HStack, { children: null, spacing: 12, alignment: 'center' })
    ).toMatchObject({
      type: { __component: 'OneNativeHost' },
      props: { axis: 'horizontal', spacing: 12, alignment: 'center' },
    })
    expect(host(Containers.VStack, { children: null, spacing: 8 }).props).toMatchObject({
      axis: 'vertical',
      spacing: 8,
      alignment: 'leading',
    })
    expect(host(Containers.Host, { children: null }).props).toMatchObject({
      axis: 'vertical',
      spacing: 0,
      alignment: 'leading',
    })
  })

  it('names the stack that was written', () => {
    expect(() => host(Containers.VStack, { children: null, spacing: -1 })).toThrow(
      'Swift.VStack spacing must be a non-negative number'
    )
    expect(() => host(Containers.HStack, { children: null, alignment: 'middle' })).toThrow(
      'Swift.HStack alignment must be one of leading, center, trailing'
    )
  })

  // a form has no ideal height, so a stack that measures what it holds reads zero for one
  // and renders nothing at all.
  it('rejects a form, which answers with no height to measure', () => {
    const form = createElement(Containers.Form, { children: null })
    expect(() => host(Containers.HStack, { children: form })).toThrow(
      'Swift.Form cannot be a child of Swift.HStack'
    )
    expect(() => render(Containers.ZStack, { children: form })).toThrow(
      'Swift.Form cannot be a child of Swift.ZStack'
    )
  })

  // a slot and a spacer are the two children that only work inside a container, and this
  // context is how they know: neither can be called outside a render to say so, because
  // reading it is a hook.
  it('marks its children as inside a container', () => {
    expect(host(Containers.HStack, { children: null }).props.children.props.value).toBe(true)
    expect(render(Containers.ZStack, { children: null }).props.children.props.value).toBe(true)
  })
})

describe('zstack', () => {
  it('centers by default and takes the alignment it is given', () => {
    expect(render(Containers.ZStack, { children: null })).toMatchObject({
      type: { __component: 'OneNativeZStack' },
      props: { alignment: 'center' },
    })
    expect(
      render(Containers.ZStack, { children: null, alignment: 'bottomTrailing' }).props
        .alignment
    ).toBe('bottomTrailing')
  })

  it('rejects an alignment it cannot map', () => {
    expect(() => render(Containers.ZStack, { children: null, alignment: 'middle' })).toThrow(
      'Swift.ZStack alignment must be one of topLeading, top, topTrailing, leading, center,'
    )
  })
})

describe('button', () => {
  // the disclosure indicator is the shape a form row takes when it opens something.
  it('carries the disclosure indicator to the native props, off by default', () => {
    expect(
      render(Button, { label: 'Change flight', disclosureIndicator: true }).props
        .disclosureIndicator
    ).toBe(true)
    expect(render(Button, { label: 'Save' }).props.disclosureIndicator).toBe(false)
  })

  // the subtitle is the second line of a two-line settings row.
  it('carries the subtitle to the native props, empty by default', () => {
    expect(
      render(Button, { label: 'Account', subtitle: 'Signed in' }).props.subtitle
    ).toBe('Signed in')
    expect(render(Button, { label: 'Save' }).props.subtitle).toBe('')
  })
})

describe('form', () => {
  it('fills its box by default', () => {
    const element = render(Containers.Form, { children: null })
    expect(element.props.sizing).toBe('fill')
    expect(element.props.style[0]).toEqual({ flex: 1 })
    expect(element.key).toBe('fill')
  })

  it('stretches without flexing in content mode and remounts across modes', () => {
    const element = render(Containers.Form, { children: null, sizing: 'content' })
    expect(element).toMatchObject({
      key: 'content',
      type: { __component: 'OneNativeForm' },
      props: { sizing: 'content' },
    })
    expect(element.props.style[0]).toEqual({ alignSelf: 'stretch' })
  })

  it('rejects a sizing it cannot map', () => {
    expect(() => render(Containers.Form, { children: null, sizing: 'tall' })).toThrow(
      'Swift.Form sizing must be one of fill, content'
    )
  })
})

describe('one-native children', () => {
  it('rejects a React Native view in every SwiftUI-composed wrapper', () => {
    // every wrapper whose children compose into SwiftUI rejects a React Native view
    // before the native insertChild precondition can fire.
    const direct: [string, (props: never) => any, Record<string, unknown>][] = [
      ['Swift.ZStack', Containers.ZStack, {}],
      ['Swift.Form', Containers.Form, {}],
      ['Swift.Section', Containers.Section, {}],
      ['Swift.List', Containers.List, {}],
      ['Swift.ScrollView', Containers.ScrollView, {}],
      ['Swift.LazyVStack', Containers.LazyVStack, {}],
      ['Swift.LazyHStack', Containers.LazyHStack, {}],
      ['Swift.LabeledContent', Containers.LabeledContent, { label: 'L' }],
      ['Swift.Glass', Containers.Glass, {}],
      ['Swift.ControlGroup', Containers.ControlGroup, {}],
      [
        'Swift.DisclosureGroup',
        Containers.DisclosureGroup,
        { label: 'More', isExpanded: false },
      ],
      ['Swift.Link', Containers.Link, { destination: 'https://example.com', label: 'x' }],
      ['Swift.Group', Containers.Group, {}],
      ['Swift.Overlay.Content', Containers.OverlayContent, {}],
      ['Swift.Overlay', Containers.Overlay, {}],
      ['Swift.SwipeActions.Actions', Containers.SwipeActionsActions, {}],
      ['Swift.SwipeActions', Containers.SwipeActions, {}],
      [
        'Swift.Popover',
        Popover,
        { isPresented: false, contentWidth: 200, contentHeight: 100, content: null },
      ],
    ]
    for (const [owner, wrapper, props] of direct)
      expect(() => render(wrapper, { ...props, children: createElement(RNView) }), owner).toThrow(
        `${owner} takes SwiftUI children; move React Native content into Swift.Slot`
      )
    for (const [owner, stack] of [
      ['Swift.Host', Containers.Host],
      ['Swift.HStack', Containers.HStack],
      ['Swift.VStack', Containers.VStack],
    ] as const)
      expect(() => host(stack, { children: createElement(RNView) }), owner).toThrow(
        `${owner} takes SwiftUI children; move React Native content into Swift.Slot`
      )
  })

  it('rejects every core native view, host element, and raw child', () => {
    for (const [name, type] of [
      ['Text', RNText],
      ['Image', RNImage],
      ['ScrollView', RNScrollView],
      ['TextInput', RNTextInput],
    ] as const)
      expect(() => render(Containers.Group, { children: createElement(type) }), name).toThrow(
        'Swift.Group takes SwiftUI children; move React Native content into Swift.Slot'
      )
    expect(() =>
      render(Containers.Group, { children: createElement('RCTView' as never) })
    ).toThrow(
      'Swift.Group takes SwiftUI children; move React Native content into Swift.Slot'
    )
    for (const [name, children] of [
      ['text', 'hello'],
      ['number', 42],
    ] as const)
      expect(() => render(Containers.Group, { children }), name).toThrow(
        'Swift.Group takes SwiftUI children, not raw text or numbers'
      )
  })

  it('reaches through fragments and still allows custom and SwiftUI children', () => {
    expect(() =>
      render(Containers.Group, {
        children: createElement(Fragment, { children: createElement(RNView) }),
      })
    ).toThrow('Swift.Group takes SwiftUI children; move React Native content into Swift.Slot')
    function Custom() {
      return null
    }
    expect(() =>
      render(Containers.Group, {
        children: [
          createElement(Custom, { key: 'custom' }),
          createElement(Button, { key: 'leaf', label: 'Save' }),
          createElement(Fragment, {
            key: 'fragment',
            children: createElement(Button, { label: 'More' }),
          }),
          null,
          false,
        ],
      })
    ).not.toThrow()
  })
})
