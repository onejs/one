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
  it('bridges transferable strings and paste events', () => {
    const onPaste = vi.fn()
    const element = Controls.Text({ text: 'example', swiftStyle: {
      copyable: { payload: ['first', 'second'] },
      draggable: { payload: 'first' },
      pasteDestination: onPaste,
    } })
    const modifiers = Object.fromEntries(JSON.parse(element.props.swiftStyle.sdkModifiers))
    expect(JSON.parse(modifiers.copyable)).toEqual([JSON.stringify(['first', 'second'])])
    expect(JSON.parse(modifiers.draggable)).toEqual(['first'])
    expect(modifiers.pasteDestination).toBe('')
    element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'pasteDestination', value: '["pasted","text"]',
    } })
    expect(onPaste).toHaveBeenCalledWith(['pasted', 'text'])
    expect(() => element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'pasteDestination', value: '["valid",3]',
    } })).toThrow('invalid struct value')
  })

  it('returns configured cut items and sends the cut action to React', () => {
    const onAction = vi.fn()
    const element = Controls.Text({ text: 'example', swiftStyle: {
      cuttable: { items: ['first', 'second'], onAction },
      mapFeatureSelectionDisabled: true,
    } })
    const modifiers = Object.fromEntries(JSON.parse(element.props.swiftStyle.sdkModifiers))
    expect(JSON.parse(modifiers.cuttable)).toEqual(['first', 'second'])
    expect(modifiers.mapFeatureSelectionDisabled).toBe('true')
    element.props.onNativeSDKEvent({ nativeEvent: { name: 'cuttable', value: '' } })
    expect(onAction).toHaveBeenCalledOnce()
    expect(() => Controls.Text({ text: 'example', swiftStyle: {
      cuttable: { items: ['first', 2 as unknown as string], onAction },
    } })).toThrow('string array and callback')
  })

  it('round trips a Codable customization binding through native JSON', () => {
    const onChange = vi.fn()
    const current = '{"perTabState":[],"identifier":"D9754350-75EE-4390-AC54-159710381977","perSectionState":[]}'
    const element = Controls.Text({ text: 'example', swiftStyle: {
      tabViewCustomization: { value: current, onChange },
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['tabViewCustomization', current],
    ])
    element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'tabViewCustomization', value: current,
    } })
    expect(onChange).toHaveBeenCalledWith(current)
    const unset = Controls.Text({ text: 'example', swiftStyle: {
      tabViewCustomization: { value: null, onChange },
    } })
    expect(JSON.parse(unset.props.swiftStyle.sdkModifiers)).toEqual([
      ['tabViewCustomization', 'null'],
    ])
    expect(() => Controls.Text({ text: 'example', swiftStyle: {
      tabViewCustomization: { value: '{broken', onChange },
    } })).toThrow()
  })

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

  it('dispatches a frozen enum callback with its associated point', () => {
    const onContinuousHover = vi.fn()
    const element = Controls.Text({ text: 'example', swiftStyle: { onContinuousHover } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([['onContinuousHover', '']])
    element.props.onNativeSDKEvent({ nativeEvent: { name: 'onContinuousHover', value: '{"case":"active","values":[{"x":12,"y":-3}]}' } })
    element.props.onNativeSDKEvent({ nativeEvent: { name: 'onContinuousHover', value: '{"case":"ended","values":[]}' } })
    expect(onContinuousHover).toHaveBeenNthCalledWith(1, { case: 'active', values: [{ x: 12, y: -3 }] })
    expect(onContinuousHover).toHaveBeenNthCalledWith(2, { case: 'ended', values: [] })
    expect(() => element.props.onNativeSDKEvent({ nativeEvent: { name: 'onContinuousHover', value: '{"case":"active","values":[{"x":"bad","y":0}]}' } })).toThrow('invalid point')
  })

  it('dispatches SDK structs with nested optional fields', () => {
    const onDragSessionUpdated = vi.fn()
    const onPencilDoubleTap = vi.fn()
    const onPencilSqueeze = vi.fn()
    const element = Controls.Text({ text: 'example', swiftStyle: {
      onDragSessionUpdated,
      onPencilDoubleTap,
      onPencilSqueeze,
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['onDragSessionUpdated', ''],
      ['onPencilDoubleTap', ''],
      ['onPencilSqueeze', ''],
    ])
    const hoverPose = {
      location: { x: 12, y: -3 },
      anchor: { x: 0.5, y: 0.25 },
      zDistance: 4,
      altitude: { radians: 1 },
      azimuth: { radians: 2 },
      roll: { radians: 3 },
    }
    const emit = (name: string, value: unknown) => element.props.onNativeSDKEvent({
      nativeEvent: { name, value: JSON.stringify(value) },
    })
    emit('onDragSessionUpdated', { location: { x: 5, y: 7 } })
    emit('onPencilDoubleTap', { hoverPose: null })
    emit('onPencilDoubleTap', { hoverPose })
    emit('onPencilSqueeze', { case: 'active', values: [{ hoverPose }] })
    emit('onPencilSqueeze', { case: 'failed', values: [] })
    expect(onDragSessionUpdated).toHaveBeenCalledWith({ location: { x: 5, y: 7 } })
    expect(onPencilDoubleTap).toHaveBeenNthCalledWith(1, { hoverPose: null })
    expect(onPencilDoubleTap).toHaveBeenNthCalledWith(2, { hoverPose })
    expect(onPencilSqueeze).toHaveBeenNthCalledWith(1, { case: 'active', values: [{ hoverPose }] })
    expect(onPencilSqueeze).toHaveBeenNthCalledWith(2, { case: 'failed', values: [] })
    expect(() => emit('onPencilDoubleTap', { hoverPose: { ...hoverPose, roll: { radians: 'bad' } } })).toThrow('invalid struct value')
    expect(() => emit('onPencilSqueeze', { case: 'active', values: [{ hoverPose: { ...hoverPose, location: { x: 'bad', y: 0 } } }] })).toThrow('invalid object')
  })

  it('dispatches stored SDK enum fields in callback objects', () => {
    const accessibilityZoomAction = vi.fn()
    const element = Controls.Text({ text: 'example', swiftStyle: { accessibilityZoomAction } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([['accessibilityZoomAction', '']])
    const payload = { direction: 'zoomIn', location: { x: 0.5, y: 0.25 }, point: { x: 80, y: 120 } }
    const emit = (value: unknown) => element.props.onNativeSDKEvent({
      nativeEvent: { name: 'accessibilityZoomAction', value: JSON.stringify(value) },
    })
    emit(payload)
    expect(accessibilityZoomAction).toHaveBeenCalledWith(payload)
    expect(() => emit({ ...payload, direction: 'sideways' })).toThrow('invalid struct value')
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

  it('encodes numeric SDK constructors and named tuples', () => {
    const rotation3DEffect = {
      angle: { radians: 0.7 },
      axis: { x: 1, y: 0, z: -1 },
      anchor: 'center' as const,
      anchorZ: 2,
      perspective: 0.5,
    }
    const element = Controls.Text({ text: 'example', swiftStyle: { rotation3DEffect } })
    const record = Object.fromEntries(JSON.parse(element.props.swiftStyle.sdkModifiers))
    const values = JSON.parse(record.rotation3DEffect)
    expect(JSON.parse(values[0])).toEqual(rotation3DEffect.angle)
    expect(JSON.parse(values[1])).toEqual(rotation3DEffect.axis)
    expect(values.slice(2)).toEqual(['center', '2', '0.5'])
    expect(() => Controls.Text({ text: 'example', swiftStyle: {
      rotation3DEffect: { ...rotation3DEffect, axis: { x: Infinity, y: 0, z: 0 } },
    } })).toThrow('rotation3DEffect.axis must be a numeric object')
  })

  it('encodes affine transforms for direct and wrapped SDK values', () => {
    const transform = { a: 1, b: 0, c: 0.25, d: 1, tx: 12, ty: -4 }
    const element = Controls.Text({ text: 'example', swiftStyle: {
      transformEffect: { transform },
      projectionEffect: { transform },
    } })
    const records = Object.fromEntries(JSON.parse(element.props.swiftStyle.sdkModifiers))
    expect(JSON.parse(JSON.parse(records.transformEffect)[0])).toEqual(transform)
    expect(JSON.parse(JSON.parse(records.projectionEffect)[0])).toEqual(transform)
    expect(() => Controls.Text({ text: 'example', swiftStyle: {
      transformEffect: { transform: { ...transform, tx: Infinity } },
    } })).toThrow('transformEffect.transform must be a numeric object')
  })

  it('encodes text lists and string sets through generated record modifiers', () => {
    const element = Controls.Text({ text: 'example', swiftStyle: {
      accessibilityCustomContent: { label: 'Account', value: 'Active' },
      accessibilityInputLabels: { inputLabels: ['Save, draft', 'Quote "text"'], isEnabled: true },
      handlesExternalEvents: { preferring: ['open*', 'tag,one'], allowing: ['*'] },
    } })
    const records = Object.fromEntries(JSON.parse(element.props.swiftStyle.sdkModifiers))
    expect(JSON.parse(records.accessibilityCustomContent)).toEqual(['Account', 'Active'])
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

  it('encodes cases imported from framework symbol graphs', () => {
    const element = Controls.Text({ text: 'example', swiftStyle: {
      keyboardType: 'URL',
      autocapitalization: 'sentences',
      textContentType: 'emailAddress',
      photosPickerDisabledCapabilities: 'search',
      photosPickerMetadataOptions: 'removeLocation',
      handlesGameControllerEvents: 'gamepad',
      previewLayout: 'sizeThatFits',
      realityViewCameraControls: 'orbit',
      asyncImageURLSession: 'shared',
      defaultAppStorage: 'standard',
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['keyboardType', 'URL'],
      ['autocapitalization', 'sentences'],
      ['textContentType', 'emailAddress'],
      ['photosPickerDisabledCapabilities', 'search'],
      ['photosPickerMetadataOptions', 'removeLocation'],
      ['handlesGameControllerEvents', 'gamepad'],
      ['previewLayout', 'sizeThatFits'],
      ['realityViewCameraControls', 'orbit'],
      ['asyncImageURLSession', 'shared'],
      ['defaultAppStorage', 'standard'],
    ])
  })

  it('encodes opaque behavior cases and optional string backed SDK values', () => {
    const element = Controls.Text({ text: 'example', swiftStyle: {
      scrollTargetBehavior: 'paging',
      navigationTransition: 'crossFade',
      previewDevice: 'iPhone 17 Pro',
      dataDetection: true,
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['scrollTargetBehavior', 'paging'],
      ['navigationTransition', 'crossFade'],
      ['previewDevice', '"iPhone 17 Pro"'],
      ['dataDetection', 'true'],
    ])
    const cleared = Controls.Text({ text: 'example', swiftStyle: { previewDevice: null } })
    expect(JSON.parse(cleared.props.swiftStyle.sdkModifiers)).toEqual([['previewDevice', 'null']])
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

  it('controls SDK focus bindings and dispatches their changes', () => {
    const focused = vi.fn()
    const searchFocused = vi.fn()
    const accessibilityFocused = vi.fn()
    const element = Controls.Text({ text: 'example', swiftStyle: {
      focused: { value: true, onChange: focused },
      searchFocused: { value: false, onChange: searchFocused },
      accessibilityFocused: { value: false, onChange: accessibilityFocused },
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['focused', 'true'],
      ['searchFocused', 'false'],
      ['accessibilityFocused', 'false'],
    ])
    const emit = (name: string, value: string) => element.props.onNativeSDKEvent({ nativeEvent: { name, value } })
    emit('focused', 'false')
    emit('searchFocused', 'true')
    emit('accessibilityFocused', 'true')
    expect(focused).toHaveBeenCalledWith(false)
    expect(searchFocused).toHaveBeenCalledWith(true)
    expect(accessibilityFocused).toHaveBeenCalledWith(true)
    expect(() => emit('focused', 'maybe')).toThrow('focused emitted an invalid boolean')
  })
})
