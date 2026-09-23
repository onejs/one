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
