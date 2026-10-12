import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type {
  NativeCNContact,
  NativeCNContactStore,
  OneContactUI,
} from '../specs/OneContactUI.nitro'
import type {
  CNContactValue,
  CNContactStoreValue,
  CNContactViewControllerOptions,
  CNContactViewControllerDelegate,
  CNKeyDescriptor,
} from './types'
export type * from './types'
function create<T extends NativeCNContact | NativeCNContactStore | OneContactUI>(
  name: string
): T {
  if (!NitroModules.hasHybridObject(name))
    throw new Error('ContactsUI needs an iOS build')
  return NitroModules.createHybridObject<T>(name)
}
const contacts = new WeakMap<CNContactValue, NativeCNContact>()
const stores = new WeakMap<CNContactStoreValue, NativeCNContactStore>()
const contactWrappers = new WeakMap<NativeCNContact, CNContact>()
const storeWrappers = new WeakMap<NativeCNContactStore, CNContactStore>()
function wrapContact(native: NativeCNContact): CNContact {
  return contactWrappers.get(native) ?? new CNContact(native)
}
function nativeContact(contact: CNContactValue): NativeCNContact {
  const value = contacts.get(contact)
  if (!value) throw new TypeError('ContactsUI requires a native CNContact')
  return value
}
class CNContact implements CNContactValue {
  protected native: NativeCNContact
  constructor(native: NativeCNContact) {
    this.native = native
    contacts.set(this, native)
    contactWrappers.set(native, this)
  }
  get identifier() {
    return this.native.identifier
  }
  get namePrefix() {
    return this.native.getContactName('namePrefix')
  }
  get givenName() {
    return this.native.getContactName('givenName')
  }
  get middleName() {
    return this.native.getContactName('middleName')
  }
  get familyName() {
    return this.native.getContactName('familyName')
  }
  get nameSuffix() {
    return this.native.getContactName('nameSuffix')
  }
  get nickname() {
    return this.native.getContactName('nickname')
  }
  get organizationName() {
    return this.native.getContactName('organizationName')
  }
  get jobTitle() {
    return this.native.getContactName('jobTitle')
  }
  isKeyAvailable(key: string) {
    return this.native.isKeyAvailable(key)
  }
  mutableCopy(): CNMutableContact {
    const copy = Object.create(CNMutableContact.prototype) as CNMutableContact
    copy.native = this.native.mutableCopy()
    contacts.set(copy, copy.native)
    contactWrappers.set(copy.native, copy)
    return copy
  }
}
export class CNMutableContact extends CNContact {
  constructor() {
    super(create<NativeCNContact>('NativeCNContact'))
  }
  override get namePrefix() {
    return super.namePrefix
  }
  override set namePrefix(value: string) {
    this.native.setName('namePrefix', value)
  }
  override get givenName() {
    return super.givenName
  }
  override set givenName(value: string) {
    this.native.setName('givenName', value)
  }
  override get middleName() {
    return super.middleName
  }
  override set middleName(value: string) {
    this.native.setName('middleName', value)
  }
  override get familyName() {
    return super.familyName
  }
  override set familyName(value: string) {
    this.native.setName('familyName', value)
  }
  override get nameSuffix() {
    return super.nameSuffix
  }
  override set nameSuffix(value: string) {
    this.native.setName('nameSuffix', value)
  }
  override get nickname() {
    return super.nickname
  }
  override set nickname(value: string) {
    this.native.setName('nickname', value)
  }
  override get organizationName() {
    return super.organizationName
  }
  override set organizationName(value: string) {
    this.native.setName('organizationName', value)
  }
  override get jobTitle() {
    return super.jobTitle
  }
  override set jobTitle(value: string) {
    this.native.setName('jobTitle', value)
  }
}
export class CNContactStore implements CNContactStoreValue {
  constructor() {
    const native = create<NativeCNContactStore>('NativeCNContactStore')
    stores.set(this, native)
    storeWrappers.set(native, this)
  }
  private get native() {
    return stores.get(this)!
  }
  unifiedContact(options: {
    withIdentifier: string
    keysToFetch: (string | CNKeyDescriptor)[]
  }): Promise<CNContact> {
    return this.native
      .unifiedContact(
        options.withIdentifier,
        options.keysToFetch.filter((key): key is string => typeof key === 'string'),
        options.keysToFetch.filter(
          (key): key is CNKeyDescriptor => typeof key !== 'string'
        )
      )
      .then(wrapContact)
      .catch(rethrowNativeError)
  }
}
let capabilities: OneContactUI | undefined
export class CNContactViewController {
  static descriptorForRequiredKeys() {
    return (capabilities ??=
      create<OneContactUI>('OneContactUI')).descriptorForRequiredKeys()
  }
  private readonly native = create<OneContactUI>('OneContactUI')
  delegate: CNContactViewControllerDelegate<CNContactViewController> | null = null
  constructor(options: CNContactViewControllerOptions) {
    if ('forContact' in options)
      this.native.configure('contact', nativeContact(options.forContact))
    else if ('forUnknownContact' in options)
      this.native.configure('unknownContact', nativeContact(options.forUnknownContact))
    else
      this.native.configure(
        'newContact',
        options.forNewContact ? nativeContact(options.forNewContact) : undefined
      )
  }
  get contact(): CNContact {
    return wrapContact(this.native.contact)
  }
  get contactStore(): CNContactStore | undefined {
    const value = this.native.getContactStore()
    if (!value) return undefined
    const existing = storeWrappers.get(value)
    if (existing) return existing
    const store = Object.create(CNContactStore.prototype) as CNContactStore
    stores.set(store, value)
    storeWrappers.set(value, store)
    return store
  }
  set contactStore(value: CNContactStoreValue | undefined) {
    const native = value === undefined ? undefined : stores.get(value)
    if (value !== undefined && !native)
      throw new TypeError('ContactsUI requires a native CNContactStore')
    this.native.setContactStore(native)
  }
  get displayedPropertyKeys() {
    return this.native.displayedPropertyKeys
  }
  set displayedPropertyKeys(value) {
    this.native.displayedPropertyKeys = value
  }
  get alternateName() {
    return this.native.alternateName
  }
  set alternateName(value) {
    this.native.alternateName = value
  }
  get message() {
    return this.native.message
  }
  set message(value) {
    this.native.message = value
  }
  get allowsEditing() {
    return this.native.allowsEditing
  }
  set allowsEditing(value) {
    this.native.allowsEditing = value
  }
  get allowsActions() {
    return this.native.allowsActions
  }
  set allowsActions(value) {
    this.native.allowsActions = value
  }
  get shouldShowLinkedContacts() {
    return this.native.shouldShowLinkedContacts
  }
  set shouldShowLinkedContacts(value) {
    this.native.shouldShowLinkedContacts = value
  }
  highlightProperty(withKey: string, identifier?: string) {
    this.native.highlightProperty(withKey, identifier)
  }
  present(animated = true) {
    return this.native
      .present(animated, (contact) =>
        this.delegate?.contactViewController?.(this, {
          didCompleteWith: contact ? wrapContact(contact) : undefined,
        })
      )
      .catch(rethrowNativeError)
  }
  dismiss(animated = true) {
    return this.native.dismiss(animated).catch(rethrowNativeError)
  }
}

export type { CNContact }
