import { describe, expect, it, vi } from 'vitest'
import {
  CNContactViewController as WebView,
  CNMutableContact as WebContact,
  CNContactStore as WebStore,
} from '../src/platform/contact-ui/index'
vi.mock('react-native-nitro-modules', () => ({
  NitroModules: { hasHybridObject: vi.fn(), createHybridObject: vi.fn() },
}))
function contact(initial: Record<string, string> = {}) {
  const names = { ...initial }
  return {
    identifier: initial.identifier ?? 'id',
    getName: vi.fn((key) => names[key] ?? ''),
    setName: vi.fn((key, value) => {
      names[key] = value
    }),
    isKeyAvailable: vi.fn(() => true),
    mutableCopy: vi.fn(() => contact(names)),
  }
}
function view(native = contact()) {
  return {
    contact: native,
    descriptorForRequiredKeys: () => ({ hash: 7 }),
    configure: vi.fn(),
    getContactStore: vi.fn(),
    setContactStore: vi.fn(),
    allowsEditing: true,
    allowsActions: true,
    shouldShowLinkedContacts: false,
    highlightProperty: vi.fn(),
    present: vi.fn(async () => {}),
    dismiss: vi.fn(async () => {}),
  }
}
async function load(
  contactValue = contact(),
  controller = view(contactValue),
  store: unknown = {}
) {
  vi.resetModules()
  const { NitroModules } = await import('react-native-nitro-modules')
  vi.mocked(NitroModules.hasHybridObject).mockReturnValue(true)
  vi.mocked(NitroModules.createHybridObject).mockImplementation(
    (name) =>
      (name === 'NativeCNContact'
        ? contactValue
        : name === 'NativeCNContactStore'
          ? store
          : controller) as never
  )
  return import('../src/platform/contact-ui/index.native')
}
describe('CNContactViewController', () => {
  it('rejects web and missing native builds instead of producing plain contact substitutes', async () => {
    expect(() => new WebContact()).toThrow('iOS build')
    expect(() => new WebStore()).toThrow('iOS build')
    expect(() => new WebView({ forNewContact: undefined })).toThrow('iOS build')
    const { CNMutableContact } = await load()
    const { NitroModules } = await import('react-native-nitro-modules')
    vi.mocked(NitroModules.hasHybridObject).mockReturnValue(false)
    expect(() => new CNMutableContact()).toThrow('iOS build')
  })
  it('retains native contacts and produces an independent mutable copy', async () => {
    const native = contact({ givenName: 'Ada', familyName: 'Lovelace' })
    const { CNMutableContact } = await load(native)
    const draft = new CNMutableContact()
    expect(draft.identifier).toBe('id')
    expect(draft.givenName).toBe('Ada')
    draft.nickname = 'Enchantress'
    expect(native.setName).toHaveBeenCalledWith('nickname', 'Enchantress')
    const copy = draft.mutableCopy()
    copy.givenName = 'Copy'
    expect(copy).toBeInstanceOf(CNMutableContact)
    expect(copy.givenName).toBe('Copy')
    expect(draft.givenName).toBe('Ada')
    expect(draft.isKeyAvailable('givenName')).toBe(true)
  })
  it('uses SDK labeled initializer alternatives and rejects plain DTOs', async () => {
    const native = contact()
    const controller = view(native)
    const { CNMutableContact, CNContactViewController: Controller } = await load(
      native,
      controller
    )
    const draft = new CNMutableContact()
    new Controller({ forContact: draft })
    new Controller({ forUnknownContact: draft })
    new Controller({ forNewContact: undefined })
    expect(controller.configure.mock.calls).toEqual([
      ['contact', native],
      ['unknownContact', native],
      ['newContact', undefined],
    ])
    expect(() => new Controller({ forContact: { identifier: 'id' } as never })).toThrow(
      'native CNContact'
    )
    expect(controller.present).not.toHaveBeenCalled()
  })
  it('preserves required key descriptors, native store identity and fetched contact objects', async () => {
    const native = contact({ givenName: 'Grace' })
    const controller = view(native)
    const store = { unifiedContact: vi.fn(async () => native) }
    const { CNContactStore: Store, CNContactViewController: Controller } = await load(
      native,
      controller,
      store
    )
    const descriptor = Controller.descriptorForRequiredKeys()
    const contacts = new Store()
    const fetched = await contacts.unifiedContact({
      withIdentifier: 'stored',
      keysToFetch: ['givenName', descriptor],
    })
    expect(store.unifiedContact).toHaveBeenCalledWith(
      'stored',
      ['givenName'],
      [descriptor]
    )
    expect(fetched.givenName).toBe('Grace')
    const viewer = new Controller({ forContact: fetched })
    viewer.contactStore = contacts
    expect(controller.setContactStore).toHaveBeenCalledWith(store)
    controller.getContactStore.mockReturnValue(store)
    expect(viewer.contactStore).toBe(contacts)
    expect(viewer.contact).toBe(fetched)
    expect(
      await viewer.contactStore?.unifiedContact({
        withIdentifier: 'stored',
        keysToFetch: [descriptor],
      })
    ).toMatchObject({ identifier: 'id' })
    viewer.contactStore = undefined
    expect(controller.setContactStore).toHaveBeenLastCalledWith(undefined)
    expect(() => {
      viewer.contactStore = {} as never
    }).toThrow('native CNContactStore')
  })
  it('forwards customization, completion/cancel identity and explicit dismissal', async () => {
    const native = contact({ givenName: 'Ada' })
    const controller = view(native)
    const { CNContactViewController: Controller } = await load(native, controller)
    const viewer = new Controller({ forNewContact: undefined })
    viewer.displayedPropertyKeys = ['givenName']
    viewer.alternateName = 'Contact'
    viewer.message = 'Message'
    viewer.allowsEditing = false
    viewer.allowsActions = false
    viewer.shouldShowLinkedContacts = true
    expect(viewer.displayedPropertyKeys).toEqual(['givenName'])
    expect(viewer.allowsEditing).toBe(false)
    expect(viewer.shouldShowLinkedContacts).toBe(true)
    viewer.highlightProperty('givenName')
    expect(controller.highlightProperty).toHaveBeenCalledWith('givenName', undefined)
    const complete = vi.fn()
    viewer.delegate = { contactViewController: complete }
    await viewer.present(false)
    const finish = controller.present.mock.calls[0][1]
    finish(undefined)
    expect(complete).toHaveBeenCalledWith(viewer, { didCompleteWith: undefined })
    finish(native)
    const response = complete.mock.calls[1][1].didCompleteWith
    expect(response.givenName).toBe('Ada')
    expect(response.identifier).toBe('id')
    expect(controller.dismiss).not.toHaveBeenCalled()
    await viewer.dismiss(false)
    expect(controller.dismiss).toHaveBeenCalledWith(false)
    viewer.delegate = null
    finish(native)
    expect(complete).toHaveBeenCalledTimes(2)
    controller.present.mockImplementation(async () => {
      throw new Error('E_CONTACT_UI_MANIFEST: missing description')
    })
    await expect(viewer.present()).rejects.toMatchObject({
      code: 'E_CONTACT_UI_MANIFEST',
    })
  })
})
