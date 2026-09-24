import { beforeAll, describe, expect, it, vi } from 'vitest'

const completeAsyncAction = vi.hoisted(() => vi.fn())
const completeAsyncString = vi.hoisted(() => vi.fn())
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '27.0' },
  NativeModules: { OneNativeAsyncActionModule: { complete: completeAsyncAction, completeString: completeAsyncString } },
}))
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', () => ({
  default: (name: string) => ({ __component: name }),
}))

let Controls: typeof import('../src/generated/Controls.native')
beforeAll(async () => {
  Controls = await import('../src/generated/Controls.native')
})

describe('SDK callback and binding transport', () => {
  it('shares a native namespace across SDK modifiers with string identifiers', () => {
    const element = Controls.Text({ text: 'source', swiftStyle: {
      matchedGeometryEffect: { id: 'hero' },
      accessibilityLabeledPair: { role: 'label', id: 'title' },
      glassEffectID: { id: 'glass' },
      glassEffectUnion: { id: null },
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['matchedGeometryEffect', '["hero"]'],
      ['accessibilityLabeledPair', '["label","title"]'],
      ['glassEffectID', '["glass"]'],
      ['glassEffectUnion', '[null]'],
    ])
  })

  it('uses SDK defaults for glass and a captured namespace for map scope', () => {
    const element = Controls.Text({ text: 'map', swiftStyle: {
      glassEffectWithGlass: 'regular',
      mapScope: true,
      paddingWithSet: 'horizontal',
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['glassEffectWithGlass', 'regular'],
      ['mapScope', 'true'],
      ['paddingWithSet', 'horizontal'],
    ])
  })

  it('uses a public shared SDK instance for album sheet modifiers', () => {
    const onCreationChange = vi.fn()
    const onCustomizationChange = vi.fn()
    const element = Controls.Text({ text: 'albums', swiftStyle: {
      photosSharedAlbumCreationSheet: { isPresented: { value: true, onChange: onCreationChange } },
      photosSharedAlbumCustomizationSheet: {
        isPresented: { value: true, onChange: onCustomizationChange }, albumIdentifier: 'album-1',
      },
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['photosSharedAlbumCreationSheet', '["true"]'],
      ['photosSharedAlbumCustomizationSheet', '["true","album-1"]'],
    ])
    element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'photosSharedAlbumCreationSheet.isPresented', value: 'false',
    } })
    element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'photosSharedAlbumCustomizationSheet.isPresented', value: 'false',
    } })
    expect(onCreationChange).toHaveBeenCalledWith(false)
    expect(onCustomizationChange).toHaveBeenCalledWith(false)
  })

  it('constructs a defaulted SDK object for a zero-input content closure', () => {
    const onChange = vi.fn()
    const element = Controls.Text({ text: 'confirm', swiftStyle: {
      actionSheet: { isPresented: { value: true, onChange }, title: 'Confirm' },
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['actionSheet', '["true","Confirm"]'],
    ])
    element.props.onNativeSDKEvent({ nativeEvent: { name: 'actionSheet.isPresented', value: 'false' } })
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('constructs public SDK subclasses for an object-returning closure', () => {
    const onChange = vi.fn()
    const element = Controls.Text({ text: 'overlay', swiftStyle: {
      appStoreOverlayWithAppConfiguration: {
        isPresented: { value: true, onChange }, appIdentifier: '123456789', position: 'bottom',
      },
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['appStoreOverlayWithAppConfiguration', '["true","123456789","bottom"]'],
    ])
    element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'appStoreOverlayWithAppConfiguration.isPresented', value: 'false',
    } })
    expect(onChange).toHaveBeenCalledWith(false)
    const clip = Controls.Text({ text: 'clip', swiftStyle: {
      appStoreOverlayWithAppClipConfiguration: {
        isPresented: { value: false, onChange }, position: 'bottomRaised',
      },
    } })
    expect(JSON.parse(clip.props.swiftStyle.sdkModifiers)).toEqual([
      ['appStoreOverlayWithAppClipConfiguration', '["false","bottomRaised"]'],
    ])
  })

  it('passes a serialized workout plan to the controlled preview', () => {
    const onChange = vi.fn()
    const element = Controls.Text({ text: 'workout', swiftStyle: {
      workoutPreview: { workout: 'AQID', isPresented: { value: true, onChange } },
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['workoutPreview', '["AQID","true"]'],
    ])
    element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'workoutPreview.isPresented', value: 'false',
    } })
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('presents current-location MapKit details through SDK object factories', () => {
    const onChange = vi.fn()
    const element = Controls.Text({ text: 'location', swiftStyle: {
      mapItemDetailSheetWithCurrentLocation: { isPresented: { value: true, onChange } },
      mapItemDetailPopoverWithCurrentLocationAndArrowEdge: {
        isPresented: { value: false, onChange }, arrowEdge: 'bottom',
      },
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['mapItemDetailSheetWithCurrentLocation', '["true"]'],
      ['mapItemDetailPopoverWithCurrentLocationAndArrowEdge', '["false","bottom"]'],
    ])
    element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'mapItemDetailSheetWithCurrentLocation.isPresented', value: 'false',
    } })
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('builds identifiable rotor entries from public labels', () => {
    const element = Controls.Text({ text: 'navigation', swiftStyle: {
      accessibilityRotor: { rotorLabel: 'Links', entries: ['Home', 'Search'] },
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['accessibilityRotor', '["Links","[\\"Home\\",\\"Search\\"]"]'],
    ])
    expect(() => Controls.Text({ text: 'duplicate', swiftStyle: {
      accessibilityRotor: { rotorLabel: 'Links', entries: ['Home', 'Home'] },
    } })).toThrow('distinct strings')
  })

  it('toggles a public boolean environment value through the SDK transform method', () => {
    const element = Controls.Text({ text: 'child', swiftStyle: {
      transformEnvironmentIsEnabled: true,
      transformEnvironmentLineSpacing: 2,
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['transformEnvironmentIsEnabled', 'true'],
      ['transformEnvironmentLineSpacing', '2'],
    ])
  })

  it('exposes a bridgeable SDK overload beside an existing style field', () => {
    const element = Controls.Text({ text: 'round', swiftStyle: {
      cornerRadiusWithRadiusAndAntialiased: { radius: 12, antialiased: false },
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['cornerRadiusWithRadiusAndAntialiased', '["12","false"]'],
    ])
  })

  it('exposes optional SDK static values beside legacy style fields', () => {
    const element = Controls.Text({ text: 'styled', swiftStyle: {
      fontWeightWithOptionalWeight: 'semibold',
      fontDesignWithOptionalDesign: 'rounded',
      tintWithOptionalColor: 'indigo',
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['fontWeightWithOptionalWeight', 'semibold'],
      ['fontDesignWithOptionalDesign', 'rounded'],
      ['tintWithOptionalColor', 'indigo'],
    ])
  })

  it('encodes numeric visual effects and scroll phase transitions from SDK methods', () => {
    const element = Controls.Text({ text: 'example', swiftStyle: {
      visualEffect: { kind: 'opacity', value: 0.8 },
      scrollTransition: { kind: 'scaleEffect', value: 0.9 },
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['visualEffect', '["opacity","0.8"]'],
      ['scrollTransition', '["scaleEffect","0.9"]'],
    ])
    expect(() => Controls.Text({ text: 'example', swiftStyle: {
      scrollTransition: { kind: 'blur' as never, value: 2 },
    } })).toThrow('scrollTransition must be a visual effect and finite value')
  })

  it('configures SDK callbacks that return purchase options and eligible offers', () => {
    const element = Controls.Text({ text: 'example', swiftStyle: {
      inAppPurchaseOptions: { quantity: 2, simulatesAskToBuyInSandbox: true },
      preferredSubscriptionOffer: 'offer-1',
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['inAppPurchaseOptions', '{"quantity":"2","simulatesAskToBuyInSandbox":"true"}'],
      ['preferredSubscriptionOffer', 'offer-1'],
    ])
    expect(() => Controls.Text({ text: 'example', swiftStyle: {
      inAppPurchaseOptions: { quantity: 'two' as never },
    } })).toThrow('inAppPurchaseOptions.quantity must be finite')
  })

  it('selects a subscription pricing term by its position in the SDK array', () => {
    const element = Controls.Text({ text: 'subscription', swiftStyle: {
      preferredSubscriptionPricingTerms: 1,
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['preferredSubscriptionPricingTerms', '1'],
    ])
    expect(() => Controls.Text({ text: 'subscription', swiftStyle: {
      preferredSubscriptionPricingTerms: -1,
    } })).toThrow('preferredSubscriptionPricingTerms must be a nonnegative index')
  })

  it('configures an SDK set from public static values', () => {
    const element = Controls.Text({ text: 'example', swiftStyle: {
      presentationDetents: ['medium', 'large'],
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['presentationDetents', '["medium","large"]'],
    ])
    expect(() => Controls.Text({ text: 'example', swiftStyle: {
      presentationDetents: ['unknown' as never],
    } })).toThrow('presentationDetents must be public SDK values')
  })

  it('round trips an optional URL binding for an SDK preview', () => {
    const onChange = vi.fn()
    const element = Controls.Text({ text: 'preview', swiftStyle: {
      quickLookPreview: { value: 'file:///tmp/photo.jpg', onChange },
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['quickLookPreview', '"file:///tmp/photo.jpg"'],
    ])
    element.props.onNativeSDKEvent({ nativeEvent: { name: 'quickLookPreview', value: 'null' } })
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('configures an SDK file importer from content type identifiers and a URL result', () => {
    const onChange = vi.fn()
    const onCompletion = vi.fn()
    const element = Controls.Text({ text: 'import', swiftStyle: {
      fileImporterWithIsPresentedAndAllowedContentTypesAndOnCompletion: {
        isPresented: { value: true, onChange },
        allowedContentTypes: ['public.image'],
        onCompletion,
      },
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['fileImporterWithIsPresentedAndAllowedContentTypesAndOnCompletion', '["true","[\\"public.image\\"]",""]'],
    ])
    element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'fileImporterWithIsPresentedAndAllowedContentTypesAndOnCompletion.onCompletion', value: '{"success":"file:///tmp/photo.jpg"}',
    } })
    expect(onCompletion).toHaveBeenCalledWith({ success: 'file:///tmp/photo.jpg' })
  })

  it('uses a public preference key for setting, transforming, and observing its value', () => {
    const onChange = vi.fn()
    const element = Controls.Text({ text: 'example', swiftStyle: {
      preferencePreferredColorScheme: 'dark',
      transformPreferencePreferredColorScheme: 'light',
      onPreferenceChangePreferredColorScheme: onChange,
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['preferencePreferredColorScheme', 'dark'],
      ['transformPreferencePreferredColorScheme', 'light'],
      ['onPreferenceChangePreferredColorScheme', ''],
    ])
    element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'onPreferenceChangePreferredColorScheme', value: '"dark"',
    } })
    expect(onChange).toHaveBeenCalledWith('dark')
  })

  it('keeps native async actions pending until the JS callback settles', async () => {
    let finish!: () => void
    const action = vi.fn(() => new Promise<void>((resolve) => { finish = resolve }))
    const element = Controls.Text({ text: 'example', swiftStyle: {
      refreshable: action,
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([['refreshable', '']])
    element.props.onNativeSDKEvent({ nativeEvent: { name: 'refreshable', value: 'action-1' } })
    await vi.waitFor(() => expect(action).toHaveBeenCalledOnce())
    expect(completeAsyncAction).not.toHaveBeenCalled()
    finish()
    await vi.waitFor(() => expect(completeAsyncAction).toHaveBeenCalledWith('action-1'))
  })

  it('passes an SDK value into an async callback before completing native work', async () => {
    completeAsyncAction.mockClear()
    let finish!: () => void
    const action = vi.fn(() => new Promise<void>((resolve) => { finish = resolve }))
    const element = Controls.Text({ text: 'example', swiftStyle: {
      onInAppPurchaseStart: action,
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([['onInAppPurchaseStart', '']])
    const product = { id: 'monthly', type: { rawValue: 'autoRenewable' }, displayName: 'Monthly', description: 'Plan',
      displayPrice: '$5', isFamilyShareable: false }
    element.props.onNativeSDKEvent({ nativeEvent: { name: 'onInAppPurchaseStart',
      value: JSON.stringify({ id: 'action-2', value: JSON.stringify(product) }) } })
    await vi.waitFor(() => expect(action).toHaveBeenCalledWith(product))
    expect(completeAsyncAction).not.toHaveBeenCalled()
    finish()
    await vi.waitFor(() => expect(completeAsyncAction).toHaveBeenCalledWith('action-2'))
  })

  it('returns a signed string or error from a generated async SDK callback', async () => {
    completeAsyncString.mockClear()
    let finish!: (value: string) => void
    const compactJWS = vi.fn(() => new Promise<string>((resolve) => { finish = resolve }))
    const element = Controls.Text({ text: 'subscription', swiftStyle: {
      subscriptionIntroductoryOffer: { applyOffer: true, compactJWS },
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['subscriptionIntroductoryOffer', 'true'],
    ])
    const product = { id: 'monthly', type: { rawValue: 'autoRenewable' }, displayName: 'Monthly',
      description: 'Plan', displayPrice: '$5', isFamilyShareable: false }
    const subscriptionInfo = { subscriptionGroupID: 'pro' }
    element.props.onNativeSDKEvent({ nativeEvent: { name: 'subscriptionIntroductoryOffer',
      value: JSON.stringify({ id: 'sign-1', value: JSON.stringify({ product, subscriptionInfo }) }) } })
    await vi.waitFor(() => expect(compactJWS).toHaveBeenCalledWith({ product, subscriptionInfo }))
    expect(completeAsyncString).not.toHaveBeenCalled()
    finish('signed-jws')
    await vi.waitFor(() => expect(completeAsyncString).toHaveBeenCalledWith('sign-1', 'signed-jws', null))

    const rejected = Controls.Text({ text: 'subscription', swiftStyle: {
      subscriptionIntroductoryOffer: { applyOffer: false, compactJWS: () => Promise.reject(new Error('signing failed')) },
    } })
    rejected.props.onNativeSDKEvent({ nativeEvent: { name: 'subscriptionIntroductoryOffer',
      value: JSON.stringify({ id: 'sign-2', value: JSON.stringify({ product, subscriptionInfo }) }) } })
    await vi.waitFor(() => expect(completeAsyncString).toHaveBeenCalledWith('sign-2', null, 'Error: signing failed'))
    expect(() => element.props.onNativeSDKEvent({ nativeEvent: { name: 'subscriptionIntroductoryOffer',
      value: JSON.stringify({ id: 'sign-3', value: JSON.stringify({ product: {}, subscriptionInfo }) }) } })).toThrow('invalid async string value')
    expect(completeAsyncString).toHaveBeenCalledWith('sign-3', null,
      'Error: subscriptionIntroductoryOffer emitted an invalid async string value')
  })

  it('selects a promotional offer by ID and returns its signed JWS', async () => {
    completeAsyncString.mockClear()
    const compactJWS = vi.fn(async () => 'promotional-jws')
    const element = Controls.Text({ text: 'promotion', swiftStyle: {
      subscriptionPromotionalOffer: { offer: 'summer', compactJWS },
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['subscriptionPromotionalOffer', 'summer'],
    ])
    const product = { id: 'monthly', type: { rawValue: 'autoRenewable' }, displayName: 'Monthly',
      description: 'Plan', displayPrice: '$5', isFamilyShareable: false }
    const subscriptionInfo = { subscriptionGroupID: 'pro' }
    const promotionalOffer = { id: 'summer', type: { rawValue: 'promotional' }, displayPrice: '$3',
      periodCount: 3, paymentMode: { rawValue: 'payAsYouGo' } }
    element.props.onNativeSDKEvent({ nativeEvent: { name: 'subscriptionPromotionalOffer',
      value: JSON.stringify({ id: 'promo-1', value: JSON.stringify({ product, subscriptionInfo, promotionalOffer }) }) } })
    await vi.waitFor(() => expect(compactJWS).toHaveBeenCalledWith({ product, subscriptionInfo, promotionalOffer }))
    await vi.waitFor(() => expect(completeAsyncString).toHaveBeenCalledWith('promo-1', 'promotional-jws', null))
  })

  it('delivers typed drop data through the generated item-provider callback', () => {
    const onDrop = vi.fn()
    const element = Controls.Text({ text: 'drop target', swiftStyle: {
      onDrop: { of: ['public.plain-text'], onDrop },
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['onDrop', '["public.plain-text"]'],
    ])
    const dropped = { type: 'public.plain-text', data: 'aGVsbG8=' }
    element.props.onNativeSDKEvent({ nativeEvent: { name: 'onDrop', value: JSON.stringify(dropped) } })
    expect(onDrop).toHaveBeenCalledWith(dropped)
    expect(() => element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'onDrop', value: JSON.stringify({ type: 'public.plain-text', data: 123 }),
    } })).toThrow('invalid drop value')
    expect(() => Controls.Text({ text: 'invalid', swiftStyle: {
      onDrop: { of: [], onDrop },
    } })).toThrow('must have content types')
  })

  it('receives a named native notification through the generated publisher', () => {
    const onAction = vi.fn()
    const element = Controls.Text({ text: 'notification', swiftStyle: {
      onReceive: { name: 'example.updated', onAction },
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['onReceive', 'example.updated'],
    ])
    element.props.onNativeSDKEvent({ nativeEvent: { name: 'onReceive', value: '' } })
    expect(onAction).toHaveBeenCalledOnce()
    expect(() => element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'onReceive', value: 'unexpected',
    } })).toThrow('invalid notification event')
  })

  it('shares drag item IDs between a generated container and its children', () => {
    const container = Controls.Text({ text: 'container', swiftStyle: {
      dragContainer: true, dragContainerSelection: ['first', 'second'],
    } })
    expect(JSON.parse(container.props.swiftStyle.sdkModifiers)).toEqual([
      ['dragContainer', 'true'],
      ['dragContainerSelection', '["first","second"]'],
    ])
    const child = Controls.Text({ text: 'item', swiftStyle: {
      draggableWithContainerItemID: 'first',
    } })
    expect(JSON.parse(child.props.swiftStyle.sdkModifiers)).toEqual([
      ['draggableWithContainerItemID', 'first'],
    ])
    expect(() => Controls.Text({ text: 'invalid', swiftStyle: {
      dragContainerSelection: [1] as unknown as string[],
    } })).toThrow('must be an array of string IDs')
  })

  it('requests a Look Around scene from coordinates and reports presentation changes', () => {
    const onChange = vi.fn()
    const element = Controls.Text({ text: 'look around', swiftStyle: {
      lookAroundViewer: { isPresented: { value: true, onChange }, latitude: 37.7749, longitude: -122.4194 },
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['lookAroundViewer', '["true","37.7749","-122.4194"]'],
    ])
    element.props.onNativeSDKEvent({ nativeEvent: { name: 'lookAroundViewer', value: 'false' } })
    expect(onChange).toHaveBeenCalledWith(false)
    expect(() => Controls.Text({ text: 'invalid', swiftStyle: {
      lookAroundViewer: { isPresented: { value: true, onChange }, latitude: 91, longitude: 0 },
    } })).toThrow('valid coordinates')
    expect(() => element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'lookAroundViewer', value: 'missing',
    } })).toThrow('invalid presentation value')
  })

  it('passes a purchase result through the async callback and rejects malformed cases', async () => {
    completeAsyncAction.mockClear()
    let finish!: () => void
    const action = vi.fn(() => new Promise<void>((resolve) => { finish = resolve }))
    const element = Controls.Text({ text: 'example', swiftStyle: {
      onInAppPurchaseCompletion: action,
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([['onInAppPurchaseCompletion', '']])
    const product = { id: 'monthly', type: { rawValue: 'autoRenewable' }, displayName: 'Monthly',
      description: 'Plan', displayPrice: '$5', isFamilyShareable: false }
    const result = { case: 'success', value: { case: 'success', values: [
      { case: 'verified', jwsRepresentation: 'signed-transaction', error: null },
    ] } }
    element.props.onNativeSDKEvent({ nativeEvent: { name: 'onInAppPurchaseCompletion',
      value: JSON.stringify({ id: 'action-3', value: JSON.stringify({ value: product, result }) }) } })
    await vi.waitFor(() => expect(action).toHaveBeenCalledWith({ value: product, result }))
    expect(completeAsyncAction).not.toHaveBeenCalled()
    finish()
    await vi.waitFor(() => expect(completeAsyncAction).toHaveBeenCalledWith('action-3'))
    expect(() => element.props.onNativeSDKEvent({ nativeEvent: { name: 'onInAppPurchaseCompletion',
      value: JSON.stringify({ id: 'action-4', value: JSON.stringify({ value: product,
        result: { case: 'success', value: { case: 'success', values: [] } } }) }) } })).toThrow('invalid async value')
  })

  it('passes StoreKit task states with their required identifiers', async () => {
    completeAsyncAction.mockClear()
    const entitlement = vi.fn()
    const productState = vi.fn()
    const productsState = vi.fn()
    const subscriptionState = vi.fn()
    const element = Controls.Text({ text: 'example', swiftStyle: {
      currentEntitlementTask: { productID: 'monthly', onAction: entitlement },
      storeProductTask: { id: 'monthly', onAction: productState },
      storeProductsTask: { ids: ['monthly', 'yearly'], onAction: productsState },
      subscriptionStatusTask: { groupID: 'pro', onAction: subscriptionState },
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['currentEntitlementTask', '["monthly"]'],
      ['storeProductTask', '["monthly"]'],
      ['storeProductsTask', JSON.stringify([JSON.stringify(['monthly', 'yearly'])])],
      ['subscriptionStatusTask', '["pro"]'],
    ])
    const state = { case: 'success', values: [{
      case: 'verified', jwsRepresentation: 'signed-entitlement', error: null,
    }] }
    element.props.onNativeSDKEvent({ nativeEvent: { name: 'currentEntitlementTask',
      value: JSON.stringify({ id: 'action-5', value: JSON.stringify(state) }) } })
    await vi.waitFor(() => expect(entitlement).toHaveBeenCalledWith(state))
    await vi.waitFor(() => expect(completeAsyncAction).toHaveBeenCalledWith('action-5'))
    const product = { id: 'monthly', type: { rawValue: 'autoRenewable' }, displayName: 'Monthly',
      description: 'Plan', displayPrice: '$5', isFamilyShareable: false }
    const loaded = { case: 'success', values: [product] }
    element.props.onNativeSDKEvent({ nativeEvent: { name: 'storeProductTask',
      value: JSON.stringify({ id: 'action-6', value: JSON.stringify(loaded) }) } })
    await vi.waitFor(() => expect(productState).toHaveBeenCalledWith(loaded))
    await vi.waitFor(() => expect(completeAsyncAction).toHaveBeenCalledWith('action-6'))
    const collected = { case: 'success', values: [[product], ['yearly']] }
    element.props.onNativeSDKEvent({ nativeEvent: { name: 'storeProductsTask',
      value: JSON.stringify({ id: 'action-7', value: JSON.stringify(collected) }) } })
    await vi.waitFor(() => expect(productsState).toHaveBeenCalledWith(collected))
    await vi.waitFor(() => expect(completeAsyncAction).toHaveBeenCalledWith('action-7'))
    const subscription = { case: 'success', values: [[{
      state: { rawValue: 1 },
      transaction: { case: 'verified', jwsRepresentation: 'signed-transaction', error: null },
      renewalInfo: { case: 'verified', jwsRepresentation: 'signed-renewal', error: null },
    }]] }
    element.props.onNativeSDKEvent({ nativeEvent: { name: 'subscriptionStatusTask',
      value: JSON.stringify({ id: 'action-8', value: JSON.stringify(subscription) }) } })
    await vi.waitFor(() => expect(subscriptionState).toHaveBeenCalledWith(subscription))
    await vi.waitFor(() => expect(completeAsyncAction).toHaveBeenCalledWith('action-8'))
  })

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

  it('routes a Boolean binding nested in an SDK record', () => {
    const onChange = vi.fn()
    const element = Controls.Text({ text: 'example', swiftStyle: {
      translationPresentation: { isPresented: { value: true, onChange }, text: 'hello' },
    } })
    const modifiers = Object.fromEntries(JSON.parse(element.props.swiftStyle.sdkModifiers))
    expect(JSON.parse(modifiers.translationPresentation)).toEqual(['true', 'hello'])
    element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'translationPresentation.isPresented', value: 'false',
    } })
    expect(onChange).toHaveBeenCalledWith(false)
    expect(() => element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'translationPresentation.isPresented', value: 'invalid',
    } })).toThrow('invalid boolean')
  })

  it('constructs an SDK value through a public string factory beside a binding', () => {
    const onChange = vi.fn()
    const element = Controls.Text({ text: 'subscription', swiftStyle: {
      appStoreMerchandising: { isPresented: { value: true, onChange }, kind: 'group-id' },
    } })
    const modifiers = Object.fromEntries(JSON.parse(element.props.swiftStyle.sdkModifiers))
    expect(JSON.parse(modifiers.appStoreMerchandising)).toEqual(['true', 'group-id'])
    element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'appStoreMerchandising.isPresented', value: 'false',
    } })
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('preserves an unsigned StoreKit transaction ID beside a presentation binding', () => {
    const onChange = vi.fn()
    const element = Controls.Text({ text: 'refund', swiftStyle: {
      refundRequestSheet: {
        transactionID: '18446744073709551615',
        isPresented: { value: true, onChange },
      },
    } })
    const modifiers = Object.fromEntries(JSON.parse(element.props.swiftStyle.sdkModifiers))
    expect(JSON.parse(modifiers.refundRequestSheet)).toEqual(['18446744073709551615', 'true'])
    element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'refundRequestSheet.isPresented', value: 'false',
    } })
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('routes a file mover completion result from a generated record', () => {
    const onChange = vi.fn()
    const onCompletion = vi.fn()
    const element = Controls.Text({ text: 'example', swiftStyle: {
      fileMover: {
        isPresented: { value: true, onChange },
        file: 'file:///tmp/source.txt',
        onCompletion,
      },
    } })
    const modifiers = Object.fromEntries(JSON.parse(element.props.swiftStyle.sdkModifiers))
    expect(JSON.parse(modifiers.fileMover)).toEqual(['true', 'file:///tmp/source.txt', ''])
    element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'fileMover.isPresented', value: 'false',
    } })
    element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'fileMover.onCompletion', value: '{"success":"file:///tmp/target.txt"}',
    } })
    expect(onChange).toHaveBeenCalledWith(false)
    expect(onCompletion).toHaveBeenCalledWith({ success: 'file:///tmp/target.txt' })
    expect(() => element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'fileMover.onCompletion', value: '{"success":12}',
    } })).toThrow('invalid result')
  })

  it('routes an optional URL binding beside a completion result', () => {
    const onChange = vi.fn()
    const onProcessingCompletion = vi.fn()
    const element = Controls.Text({ text: 'example', swiftStyle: {
      photosReferenceImageViewer: {
        fileURL: { value: null, onChange },
        onProcessingCompletion,
      },
    } })
    const modifiers = Object.fromEntries(JSON.parse(element.props.swiftStyle.sdkModifiers))
    expect(JSON.parse(modifiers.photosReferenceImageViewer)).toEqual(['null', ''])
    element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'photosReferenceImageViewer.fileURL', value: '"file:///tmp/photo.jpg"',
    } })
    element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'photosReferenceImageViewer.onProcessingCompletion', value: '{"failure":"unavailable"}',
    } })
    expect(onChange).toHaveBeenCalledWith('file:///tmp/photo.jpg')
    expect(onProcessingCompletion).toHaveBeenCalledWith({ failure: 'unavailable' })
    expect(() => element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'photosReferenceImageViewer.fileURL', value: '3',
    } })).toThrow('invalid URL')
  })

  it('specializes a transferable file export to a string item', () => {
    const onChange = vi.fn()
    const onCompletion = vi.fn()
    const element = Controls.Text({ text: 'example', swiftStyle: {
      fileExporter: {
        isPresented: { value: true, onChange },
        item: 'exported text',
        onCompletion,
      },
    } })
    const modifiers = Object.fromEntries(JSON.parse(element.props.swiftStyle.sdkModifiers))
    expect(JSON.parse(modifiers.fileExporter)).toEqual(['true', 'exported text', ''])
    element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'fileExporter.onCompletion', value: '{"success":"file:///tmp/export.txt"}',
    } })
    expect(onCompletion).toHaveBeenCalledWith({ success: 'file:///tmp/export.txt' })
  })

  it('carries a point binding through the WebView host', () => {
    const onChange = vi.fn()
    const element = Controls.WebView({ html: '<p>hello</p>', swiftStyle: {
      webViewScrollPosition: { value: { x: 12, y: 24 }, onChange },
    } })
    const modifiers = Object.fromEntries(JSON.parse(element.props.swiftStyle.sdkModifiers))
    expect(modifiers.webViewScrollPosition).toBe('{"x":12,"y":24}')
    element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'webViewScrollPosition', value: '{"x":10,"y":5}',
    } })
    expect(onChange).toHaveBeenCalledWith({ x: 10, y: 5 })
    expect(() => element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'webViewScrollPosition', value: '{"x":"bad","y":5}',
    } })).toThrow('invalid point')
    expect(() => Controls.WebView({ html: '<p>hello</p>', swiftStyle: {
      webViewScrollPosition: { value: { x: Infinity, y: 0 }, onChange },
    } })).toThrow('point binding')
  })

  it('projects public drop-session fields without changing an existing callback', () => {
    const onDropSessionUpdated = vi.fn()
    const onMapCameraChange = vi.fn()
    const onMapCameraChangeWithEventStruct = vi.fn()
    const element = Controls.Text({ text: 'example', swiftStyle: {
      onDropSessionUpdated,
      onMapCameraChange,
      onMapCameraChangeWithEventStruct,
    } })
    const drop = {
      itemsCount: 2,
      suggestedOperations: { rawValue: 3 },
      size: { width: 80, height: 40 },
      location: { x: 10, y: 5 },
    }
    element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'onDropSessionUpdated', value: JSON.stringify(drop),
    } })
    element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'onMapCameraChange', value: '',
    } })
    element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'onMapCameraChangeWithEventStruct',
      value: '{"camera":{"distance":100,"heading":90,"pitch":20}}',
    } })
    expect(onDropSessionUpdated).toHaveBeenCalledWith(drop)
    expect(onMapCameraChange).toHaveBeenCalledOnce()
    expect(onMapCameraChangeWithEventStruct).toHaveBeenCalledWith({
      camera: { distance: 100, heading: 90, pitch: 20 },
    })
  })

  it('projects a public framework class event and its enum phase', () => {
    const onCameraCaptureEvent = vi.fn()
    const element = Controls.Text({ text: 'example', swiftStyle: { onCameraCaptureEvent } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['onCameraCaptureEvent', ''],
    ])
    element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'onCameraCaptureEvent', value: '{"phase":"began"}',
    } })
    expect(onCameraCaptureEvent).toHaveBeenCalledWith({ phase: 'began' })
    expect(() => element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'onCameraCaptureEvent', value: '{"phase":"invalid"}',
    } })).toThrow('invalid struct value')
  })

  it('routes a class event and configures writable class fields', () => {
    const onContinue = vi.fn()
    const element = Controls.Text({ text: 'example', swiftStyle: {
      onContinueUserActivity: { activityType: 'example.edit', action: onContinue },
      userActivity: {
        activityType: 'example.edit', isActive: true,
        update: { title: 'Draft', isEligibleForHandoff: true },
      },
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['onContinueUserActivity', '["example.edit",""]'],
      ['userActivity', '["example.edit","true","{\\"title\\":\\"Draft\\",\\"isEligibleForHandoff\\":true}"]'],
    ])
    const activity = {
      activityType: 'example.edit',
      isEligibleForHandoff: true,
      isEligibleForPrediction: false,
      isEligibleForPublicIndexing: false,
      isEligibleForSearch: false,
      needsSave: false,
      supportsContinuationStreams: false,
      targetContentIdentifier: null,
      title: 'Draft',
    }
    element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'onContinueUserActivity.action', value: JSON.stringify(activity),
    } })
    expect(onContinue).toHaveBeenCalledWith(activity)
    expect(() => Controls.Text({ text: 'example', swiftStyle: {
      userActivity: {
        activityType: 'example.edit', isActive: true,
        update: { title: 42 as unknown as string },
      },
    } })).toThrow('SDK class update')
  })

  it('returns configured SDK results and dispatches structured callback inputs', () => {
    const onDrop = vi.fn()
    const onKey = vi.fn()
    const element = Controls.Text({ text: 'example', swiftStyle: {
      dropConfiguration: { result: 'copy', onAction: onDrop },
      onKeyPress: { result: 'handled', onAction: onKey },
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['dropConfiguration', 'copy'],
      ['onKeyPress', 'handled'],
    ])
    const drop = {
      itemsCount: 2,
      suggestedOperations: { rawValue: 3 },
      size: { width: 80, height: 40 },
      location: { x: 10, y: 5 },
    }
    element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'dropConfiguration', value: JSON.stringify(drop),
    } })
    element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'onKeyPress', value: '{"characters":"a","modifiers":{"rawValue":1}}',
    } })
    expect(onDrop).toHaveBeenCalledWith(drop)
    expect(onKey).toHaveBeenCalledWith({ characters: 'a', modifiers: { rawValue: 1 } })
    expect(() => Controls.Text({ text: 'example', swiftStyle: {
      onKeyPress: { result: 'invalid' as 'handled', onAction: onKey },
    } })).toThrow('SDK result and callback')
    expect(() => element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'dropConfiguration', value: '{"itemsCount":"bad"}',
    } })).toThrow('invalid result event')
  })

  it('sends transferable drop items with the SDK session', () => {
    const onDrop = vi.fn()
    const element = Controls.Text({ text: 'example', swiftStyle: { dropDestination: onDrop } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['dropDestination', ''],
    ])
    const event = {
      items: ['first', 'second'],
      session: {
        itemsCount: 2,
        suggestedOperations: { rawValue: 1 },
        size: { width: 40, height: 20 },
        location: { x: 5, y: 7 },
      },
    }
    element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'dropDestination', value: JSON.stringify(event),
    } })
    expect(onDrop).toHaveBeenCalledWith(event)
    expect(() => element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'dropDestination', value: JSON.stringify({ ...event, items: ['first', 2] }),
    } })).toThrow('invalid struct value')
  })

  it('configures drag item providers from strings', () => {
    const element = Controls.Text({ text: 'example', swiftStyle: {
      itemProvider: 'shared text',
      onDrag: 'dragged text',
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['itemProvider', 'shared text'],
      ['onDrag', 'dragged text'],
    ])
    expect(() => Controls.Text({ text: 'example', swiftStyle: {
      onDrag: 3 as unknown as string,
    } })).toThrow('must be a string')
  })

  it('routes generated gesture end values through each gesture modifier', () => {
    const onTap = vi.fn()
    const onDrag = vi.fn()
    const onLongPress = vi.fn()
    const element = Controls.Text({ text: 'example', swiftStyle: {
      gesture: { kind: 'tap', onEnded: onTap },
      highPriorityGesture: { kind: 'drag', onEnded: onDrag },
      simultaneousGesture: { kind: 'longPress', onEnded: onLongPress },
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['gesture', 'tap'],
      ['highPriorityGesture', 'drag'],
      ['simultaneousGesture', 'longPress'],
    ])
    const drag = { location: { x: 20, y: 30 }, startLocation: { x: 5, y: 10 } }
    element.props.onNativeSDKEvent({ nativeEvent: { name: 'gesture', value: '' } })
    element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'highPriorityGesture', value: JSON.stringify(drag),
    } })
    element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'simultaneousGesture', value: 'true',
    } })
    expect(onTap).toHaveBeenCalledOnce()
    expect(onDrag).toHaveBeenCalledWith(drag)
    expect(onLongPress).toHaveBeenCalledWith(true)
    expect(() => Controls.Text({ text: 'example', swiftStyle: {
      gesture: { kind: 'unknown' as 'tap', onEnded: onTap },
    } })).toThrow('SDK gesture and callback')
    expect(() => element.props.onNativeSDKEvent({ nativeEvent: {
      name: 'highPriorityGesture', value: '{"location":{"x":20,"y":"bad"}}',
    } })).toThrow('invalid gesture event')
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

  it('enables SDK default focus through self-owned Boolean focus state', () => {
    const element = Controls.Text({ text: 'example', swiftStyle: {
      defaultFocus: true,
      accessibilityDefaultFocus: false,
    } })
    expect(JSON.parse(element.props.swiftStyle.sdkModifiers)).toEqual([
      ['defaultFocus', 'true'],
      ['accessibilityDefaultFocus', 'false'],
    ])
    expect(() => Controls.Text({ text: 'example', swiftStyle: {
      defaultFocus: 'yes' as unknown as boolean,
    } })).toThrow('defaultFocus must be a boolean')
  })
})
