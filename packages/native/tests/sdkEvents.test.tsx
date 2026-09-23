import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '27.0' },
}))
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', () => ({
  default: (name: string) => ({ __component: name }),
}))

let Controls: typeof import('../src/generated/Controls.native')
beforeAll(async () => {
  Controls = await import('../src/generated/Controls.native')
})

describe('SDK callback and binding transport', () => {
  it('dispatches SDK enum callbacks with their typed case values', () => {
    const adjust = vi.fn()
    const scroll = vi.fn()
    const element = Controls.Text({ text: 'example', swiftStyle: {
      accessibilityAdjustableAction: adjust,
      onScrollPhaseChange: scroll,
    } })
    element.props.onNativeSDKEvent({ nativeEvent: { name: 'accessibilityAdjustableAction', value: 'increment' } })
    element.props.onNativeSDKEvent({ nativeEvent: { name: 'onScrollPhaseChange', value: '["tracking","idle"]' } })
    expect(adjust).toHaveBeenCalledWith('increment')
    expect(scroll).toHaveBeenCalledWith('tracking', 'idle')
    expect(() => element.props.onNativeSDKEvent({ nativeEvent: { name: 'accessibilityAdjustableAction', value: 'unknown' } })).toThrow('invalid enum value')
  })

  it('encodes URL values and dispatches optional StoreKit actions', () => {
    const onSignIn = vi.fn()
    const element = Controls.Text({ text: 'example', swiftStyle: {
      fileDialogDefaultDirectory: null,
      navigationDocument: 'file:///tmp/document.txt',
      subscriptionStorePolicyDestination: { url: 'https://example.com/privacy', button: 'privacyPolicy' },
      subscriptionStoreSignInAction: onSignIn,
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['fileDialogDefaultDirectory', 'null'],
      ['navigationDocument', 'file:///tmp/document.txt'],
      ['subscriptionStorePolicyDestination', '["https://example.com/privacy","privacyPolicy"]'],
      ['subscriptionStoreSignInAction', ''],
    ])
    element.props.onNativeSDKEvent({ nativeEvent: { name: 'subscriptionStoreSignInAction', value: '' } })
    expect(onSignIn).toHaveBeenCalledOnce()
  })

  it('encodes labeled scalar and enum arguments for the Swift modifier calls', () => {
    const element = Controls.Text({ text: 'example', swiftStyle: {
      offset: { x: 12, y: -4 },
      toolbarVisibility: { visibility: 'hidden', bars: 'navigationBar' },
      menuStyle: 'automatic',
      textEditorStyle: 'plain',
      textCase: 'uppercase',
      truncationMode: 'tail',
      id: 'row-1',
      tag: 'selection-1',
      coordinateSpace: 'chart',
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['offset', '["12","-4"]'],
      ['toolbarVisibility', '["hidden","navigationBar"]'],
      ['menuStyle', 'automatic'],
      ['textEditorStyle', 'plain'],
      ['textCase', 'uppercase'],
      ['truncationMode', 'tail'],
      ['id', 'row-1'],
      ['tag', 'selection-1'],
      ['coordinateSpace', 'chart'],
    ])
    expect(() => Controls.Text({ text: 'example', swiftStyle: {
      offset: { x: Number.POSITIVE_INFINITY, y: 0 },
    } })).toThrow('offset.x must be finite')
  })

  it('encodes text lists and string sets through generated record modifiers', () => {
    const element = Controls.Text({ text: 'example', swiftStyle: {
      accessibilityInputLabels: { inputLabels: ['Save, draft', 'Quote "text"'], isEnabled: true },
      handlesExternalEvents: { preferring: ['open*', 'tag,one'], allowing: ['*'] },
    } })
    const records = Object.fromEntries(JSON.parse(element.props.swiftStyle.sdkModifiers))
    expect(JSON.parse(JSON.parse(records.accessibilityInputLabels)[0])).toEqual(['Save, draft', 'Quote "text"'])
    expect(JSON.parse(JSON.parse(records.handlesExternalEvents)[0])).toEqual(['open*', 'tag,one'])
    expect(JSON.parse(JSON.parse(records.handlesExternalEvents)[1])).toEqual(['*'])
    expect(() => Controls.Text({ text: 'example', swiftStyle: {
      handlesExternalEvents: { preferring: [4], allowing: [] },
    } as never })).toThrow('handlesExternalEvents.preferring must be a string array')
  })

  it('specializes Equatable triggers to strings and dispatches their callbacks', () => {
    const onChange = vi.fn()
    const element = Controls.Text({ text: 'example', swiftStyle: {
      onChange: { value: 'first', onChange },
      sensoryFeedback: { feedback: 'success', trigger: 'first' },
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['onChange', 'first'],
      ['sensoryFeedback', '["success","first"]'],
    ])
    element.props.onNativeSDKEvent({ nativeEvent: { name: 'onChange', value: 'second' } })
    expect(onChange).toHaveBeenCalledWith('second')
    expect(() => Controls.Text({ text: 'example', swiftStyle: {
      onChange: { value: 42, onChange },
    } as never })).toThrow('onChange must be a string value and callback')
  })

  it('passes values to Swift and dispatches native events to the current callbacks', () => {
    const appeared = vi.fn()
    const onChange = vi.fn()
    const onHover = vi.fn()
    const onOpenURL = vi.fn()
    const swiftStyle = {
      onAppear: appeared,
      onHover,
      onOpenURLWithPerform: onOpenURL,
      onOpenURLWithPrefersInApp: true,
      findNavigator: { value: false, onChange },
    }
    const element = Controls.Text({ text: 'example', swiftStyle })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['onAppear', ''],
      ['onHover', ''],
      ['onOpenURLWithPerform', ''],
      ['onOpenURLWithPrefersInApp', 'true'],
      ['findNavigator', 'false'],
    ])
    element.props.onNativeSDKEvent({ nativeEvent: { name: 'onAppear', value: '' } })
    element.props.onNativeSDKEvent({ nativeEvent: { name: 'onHover', value: 'true' } })
    element.props.onNativeSDKEvent({ nativeEvent: { name: 'onOpenURLWithPerform', value: 'https://example.com' } })
    element.props.onNativeSDKEvent({ nativeEvent: { name: 'findNavigator', value: 'true' } })
    expect(appeared).toHaveBeenCalledOnce()
    expect(onHover).toHaveBeenCalledWith(true)
    expect(onOpenURL).toHaveBeenCalledWith('https://example.com')
    expect(onChange).toHaveBeenCalledWith(true)
  })
})
