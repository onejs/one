import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({ Platform: { OS: 'ios', Version: '27.0' } }))
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', () => ({
  default: (name: string) => name,
}))

let controls: typeof import('../src/platform/generated/Controls.native')
beforeAll(async () => {
  controls = await import('../src/platform/generated/Controls.native')
})

describe('AsyncImage constructor', () => {
  it('allows the nil URL representation to reach the SDK placeholder', () => {
    expect(controls.AsyncImage({ url: '' }).props).toMatchObject({ url: '', scale: 1 })
  })

  it('preserves URL and scale and rejects a non-string URL', () => {
    expect(
      controls.AsyncImage({ url: 'https://example.com/image.jpg', scale: 2 }).props
    ).toMatchObject({ url: 'https://example.com/image.jpg', scale: 2 })
    expect(() => controls.AsyncImage({ url: 42 as never })).toThrow(
      'url must be a string'
    )
  })
})

describe('LocationButton constructor', () => {
  it('forwards the SDK title and delivers only the native action callback', () => {
    const onAction = vi.fn()
    const element = controls.LocationButton({ title: 'shareCurrentLocation', onAction })
    expect(element.props.title).toBe('shareCurrentLocation')
    expect(onAction).not.toHaveBeenCalled()
    element.props.onNativeLocationButtonAction({ nativeEvent: { eventCount: 1 } })
    expect(onAction).toHaveBeenCalledExactlyOnceWith()
  })

  it('rejects a title outside the SDK enum', () => {
    expect(() => controls.LocationButton({ title: 'purchase' as never })).toThrow(
      'title must be one of'
    )
  })
})

describe('ShortcutsLink constructor', () => {
  it('delivers the SDK action without firing it on construction', () => {
    const onAction = vi.fn()
    const element = controls.ShortcutsLink({ onAction })
    expect(onAction).not.toHaveBeenCalled()
    element.props.onNativeShortcutsLinkAction({ nativeEvent: { eventCount: 1 } })
    expect(onAction).toHaveBeenCalledExactlyOnceWith()
    expect(() =>
      controls
        .ShortcutsLink({})
        .props.onNativeShortcutsLinkAction({ nativeEvent: { eventCount: 1 } })
    ).not.toThrow()
  })
})

describe('ProductView constructor', () => {
  it('forwards the catalog identifier and promotional icon preference', () => {
    expect(
      controls.ProductView({ id: 'fixture.unlock', prefersPromotionalIcon: true }).props
    ).toMatchObject({ id: 'fixture.unlock', prefersPromotionalIcon: true })
    expect(() => controls.ProductView({ id: '' })).toThrow('id is required')
  })
})

describe('StoreView constructor', () => {
  it('preserves ordered identifiers and rejects non-string catalog entries', () => {
    expect(
      controls.StoreView({ ids: ['fixture.second', 'fixture.first'] }).props
    ).toMatchObject({
      ids: ['fixture.second', 'fixture.first'],
      prefersPromotionalIcon: false,
    })
    expect(() => controls.StoreView({ ids: [42 as never] })).toThrow(
      'ids must be an array of strings'
    )
  })
})

describe('SubscriptionStoreView constructors', () => {
  it('selects groupID and productIDs independently with their SDK arguments', () => {
    expect(
      controls.SubscriptionStoreView({
        groupID: 'fixture.group',
        visibleRelationships: 'upgrade',
      }).props
    ).toMatchObject({
      groupID: 'fixture.group',
      visibleRelationships: 'upgrade',
      initializer: 0,
    })
    expect(
      controls.SubscriptionStoreView({ productIDs: ['fixture.monthly'] }).props
    ).toMatchObject({ productIDs: ['fixture.monthly'], initializer: 1 })
  })

  it('rejects absent, conflicting and inapplicable constructor arguments', () => {
    expect(() => controls.SubscriptionStoreView({})).toThrow('takes exactly one of')
    expect(() =>
      controls.SubscriptionStoreView({ groupID: 'group', productIDs: ['monthly'] })
    ).toThrow('takes exactly one of')
    expect(() =>
      controls.SubscriptionStoreView({
        productIDs: ['monthly'],
        visibleRelationships: 'upgrade',
      })
    ).toThrow('visibleRelationships does not apply with productIDs')
  })
})
