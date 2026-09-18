import { createElement } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

// each container is a plain function over the spec modules, so a test reads the element it
// builds rather than mounting a native view. the spec modules and Platform are the only
// react-native surface involved, and a mock only reaches an import that happens after it
// is registered, so both are set up here and the wrappers are imported below.
vi.mock('react-native', () => ({ Platform: { OS: 'ios', Version: '26.4' } }))
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', () => ({
  default: (name: string) => ({ __component: name }),
}))

let Containers: typeof import('../src/Containers.native')
let Button: typeof import('../src/generated/Controls.native').Button

beforeAll(async () => {
  Containers = await import('../src/Containers.native')
  Button = (await import('../src/generated/Controls.native')).Button
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
})
