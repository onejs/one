import type { HybridObject } from 'react-native-nitro-modules'
import {
  CNContact,
  CNContactEmailAddressesKey,
  CNContactFamilyNameKey,
  CNContactFetchRequest,
  CNContactGivenNameKey,
  CNContactIdentifierKey,
  CNContactPhoneNumbersKey,
  CNContactPostalAddressesKey,
  CNContactStore,
  CNErrorDomain,
  CNLabelHome,
  CNLabelPhoneNumberMain,
  CNLabeledValue,
  CNMutableContact,
  CNMutablePostalAddress,
  CNPhoneNumber,
  CNSaveRequest,
  type CNPostalAddress,
} from 'one/ios/Contacts'
import { CNContactPickerViewController } from 'one/ios/ContactsUI'
import { Bundle, NSError, NSPredicate, type NSString } from 'one/ios/Foundation'
import { NSObject } from 'one/ios/ObjectiveC'
import { UIApplication, UIViewController } from 'one/ios/UIKit'
import type { SDKHandle } from 'one/ios-runtime'
import type {
  ContactChanges,
  ContactInfo,
  ContactInput,
  ContactPostalAddressInput,
  ContactsPermissionStatus,
  OneContacts,
} from '../specs/OneContacts.nitro'
import {
  hasBlank,
  mapPermissionStatus,
  validPostalAddresses,
  validSearch,
} from './map'

// keysToFetch crosses as plain strings; the native table casts them to
// CNKeyDescriptor directly (lead native proof, no conversion needed).
const KEYS = [
  CNContactIdentifierKey,
  CNContactGivenNameKey,
  CNContactFamilyNameKey,
  CNContactPhoneNumbersKey,
  CNContactEmailAddressesKey,
  CNContactPostalAddressesKey,
] as unknown as SDKHandle[]

type ReadableContact = Pick<
  CNContact,
  | 'identifier'
  | 'givenName'
  | 'familyName'
  | 'phoneNumbers'
  | 'emailAddresses'
  | 'postalAddresses'
>

function failure(verb: string, code: string, detail: string): Error {
  return Object.assign(new Error(`Contacts.${verb}: ${detail}`), { code })
}

// native throws surface as E_SDK with "module #id: <localized>" ahead of the
// message. the code never survives, so keep only the localized tail; anything
// else falls back to a static detail so an E_ token can never leak into the
// message and overwrite the contacts code in rethrowNativeError.
function detail(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : String(error)
  return /^E_SDK: \S+ #\d+: ([\s\S]*)$/.exec(message)?.[1] ?? fallback
}

function assertUsage(verb: string): void {
  const usage = Bundle.main.object('NSContactsUsageDescription')
  if (typeof usage !== 'string' || !usage.trim()) {
    throw failure(verb, 'E_CONTACTS_MANIFEST', 'set native.app.contacts.usage')
  }
}

function getPermissionStatus(): ContactsPermissionStatus {
  return mapPermissionStatus(CNContactStore.authorizationStatus('contacts'))
}

function assertAccess(verb: string): void {
  const status = getPermissionStatus()
  if (status !== 'authorized' && status !== 'limited') {
    throw failure(verb, 'E_CONTACTS_PERMISSION', 'Contacts permission is required')
  }
}

// email values are NSString handles in a class-preserving box, or plain
// strings when the runtime bridges them; both read the same way.
function labeledString(item: CNLabeledValue<NSString>): string {
  const value: unknown = item.value
  if (typeof value === 'string') return value
  const native = value as NSString
  return native.substringTo(native.length)
}

function readContact(contact: ReadableContact): ContactInfo {
  return {
    identifier: contact.identifier,
    givenName: contact.givenName,
    familyName: contact.familyName,
    phoneNumbers: contact.phoneNumbers.map((item) => item.value.stringValue),
    emailAddresses: contact.emailAddresses.map(labeledString),
    postalAddresses: contact.postalAddresses.map((item) => {
      const address = item.value
      return {
        label: item.label ?? '',
        street: address.street,
        subLocality: address.subLocality,
        city: address.city,
        subAdministrativeArea: address.subAdministrativeArea,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        isoCountryCode: address.isoCountryCode,
      }
    }),
  }
}

function buildPhones(
  values: string[],
  existing: Array<CNLabeledValue<CNPhoneNumber>>
): Array<CNLabeledValue<CNPhoneNumber>> {
  const remaining = [...existing]
  return values.map((value) => {
    const index = remaining.findIndex((item) => item.value.stringValue === value)
    if (index >= 0) return remaining.splice(index, 1)[0]
    return CNLabeledValue.init(
      CNLabelPhoneNumberMain,
      CNPhoneNumber.initStringValue(value)
    )
  })
}

function buildEmails(
  values: string[],
  existing: Array<CNLabeledValue<NSString>>
): Array<CNLabeledValue<NSString>> {
  const remaining = [...existing]
  return values.map((value) => {
    const index = remaining.findIndex((item) => labeledString(item) === value)
    if (index >= 0) return remaining.splice(index, 1)[0]
    // the emitted table switches the value to NSString natively, so the raw
    // string crosses and bridges on the native side.
    return CNLabeledValue.init(CNLabelHome, value as unknown as NSString)
  })
}

function sameAddress(left: CNPostalAddress, right: CNPostalAddress): boolean {
  return (
    left.street === right.street &&
    left.subLocality === right.subLocality &&
    left.city === right.city &&
    left.subAdministrativeArea === right.subAdministrativeArea &&
    left.state === right.state &&
    left.postalCode === right.postalCode &&
    left.country === right.country &&
    left.isoCountryCode === right.isoCountryCode
  )
}

function buildAddresses(
  values: ContactPostalAddressInput[],
  existing: Array<CNLabeledValue<CNPostalAddress>>
): Array<CNLabeledValue<CNPostalAddress>> {
  const remaining = [...existing]
  return values.map((value) => {
    const address = CNMutablePostalAddress.init()
    address.street = value.street ?? ''
    address.subLocality = value.subLocality ?? ''
    address.city = value.city ?? ''
    address.subAdministrativeArea = value.subAdministrativeArea ?? ''
    address.state = value.state ?? ''
    address.postalCode = value.postalCode ?? ''
    address.country = value.country ?? ''
    address.isoCountryCode = value.isoCountryCode ?? ''
    const index = remaining.findIndex(
      (item) =>
        sameAddress(item.value, address) &&
        (value.label === undefined ||
          value.label === null ||
          item.label === value.label)
    )
    if (index >= 0) return remaining.splice(index, 1)[0]
    return CNLabeledValue.init(value.label ?? CNLabelHome, address)
  })
}

function mutableCopyOf(contact: CNContact): CNMutableContact {
  const copied = new NSObject(contact.$handle).mutableCopy() as SDKHandle
  return new CNMutableContact(copied.$handle)
}

// CNError.Code.recordDoesNotExist raw value, read off the real Contacts
// framework on macOS; the structured-error seam carries it as nativeCode.
const RECORD_DOES_NOT_EXIST = 200

function isRecordGone(cause: unknown): boolean {
  if (typeof cause !== 'object' || cause === null) return false
  const { domain, nativeCode } = cause as { domain?: unknown; nativeCode?: unknown }
  return domain === CNErrorDomain && nativeCode === RECORD_DOES_NOT_EXIST
}

// native failures classify off their own metadata; absent metadata (before
// the structured-error seam) keeps the save/delete code, never not-found.
function saveFailure(
  verb: 'update' | 'delete',
  code: 'E_CONTACTS_SAVE' | 'E_CONTACTS_DELETE',
  cause: unknown
): Error {
  if (isRecordGone(cause)) {
    return failure(verb, 'E_CONTACTS_NOT_FOUND', detail(cause, 'the contact no longer exists'))
  }
  return failure(verb, code, detail(cause, 'could not save the contact'))
}

async function requestPermission(): Promise<ContactsPermissionStatus> {
  assertUsage('requestPermission')
  return new Promise((resolve, reject) => {
    CNContactStore.init().requestAccess('contacts', (_granted, error) => {
      const status = getPermissionStatus()
      if (status !== 'notDetermined') {
        resolve(status)
        return
      }
      if (error) {
        reject(
          failure(
            'requestPermission',
            'E_CONTACTS_PERMISSION',
            new NSError(error.$handle).localizedDescription
          )
        )
        return
      }
      resolve(status)
    })
  })
}

let pickerBusy = false

async function pickContact(): Promise<ContactInfo | undefined> {
  if (pickerBusy) {
    throw failure('pickContact', 'E_CONTACTS_PICKER', 'a picker is already open')
  }
  pickerBusy = true
  try {
    const application = await UIApplication.shared
    const window = await application.keyWindow
    let presenter = window ? await window.rootViewController : null
    while (presenter) {
      const next = await presenter.presentedViewController
      if (!next) break
      presenter = next
    }
    const view = presenter ? await presenter.view : null
    if (
      !presenter ||
      !view ||
      !(await view.window) ||
      (await application.applicationState) !== 'active' ||
      (await presenter.isBeingDismissed) ||
      (await presenter.isBeingPresented) ||
      (await presenter.transitionCoordinator) !== null
    ) {
      throw failure('pickContact', 'E_CONTACTS_PICKER', 'no active view controller')
    }
    const picker = await CNContactPickerViewController.init()
    await picker.setPredicateForSelectionOfContact(NSPredicate.initValue(true))
    // present/dismiss/presentationController live on the UIKit base, which the
    // contacts picker facade does not extend, so drive them through the same
    // handle viewed as a view controller.
    const presented = new UIViewController(picker.$handle)
    return await new Promise<ContactInfo | undefined>((resolve, reject) => {
      let finishing = false
      const finish = (contact: CNContact | null) => {
        if (finishing) return
        finishing = true
        void (async () => {
          const info = contact ? readContact(contact) : undefined
          await new Promise<void>((done, failed) => {
            presented.dismiss(true, done).catch(failed)
          })
          resolve(info)
        })().catch(reject)
      }
      const swipe = () => {
        if (finishing) return
        finishing = true
        resolve(undefined)
      }
      // single-selection mode only delivers one contact; the array form of the
      // union cannot fire without multiple selection so it settles empty.
      void picker.setDelegate({
        contactPickerDidSelect: (_picker, selected) => {
          finish(
            Array.isArray(selected) ? null : (selected as unknown as CNContact)
          )
        },
        contactPickerDidCancel: () => {
          finish(null)
        },
      })
        .then(() => presenter.present(presented, true, () => {
          void presented.presentationController
            .then((controller) =>
              controller?.setDelegate({
                presentationControllerDidDismiss: () => {
                  swipe()
                },
              })
            )
            .catch(reject)
        }))
        .catch(reject)
    })
  } catch (error) {
    if (error instanceof Error && 'code' in error) throw error
    throw failure(
      'pickContact',
      'E_CONTACTS_PICKER',
      detail(error, 'could not pick a contact')
    )
  } finally {
    pickerBusy = false
  }
}

async function search(name: string, limit: number): Promise<ContactInfo[]> {
  assertUsage('search')
  assertAccess('search')
  const text = name.trim()
  if (!validSearch(text, limit)) {
    throw failure(
      'search',
      'E_CONTACTS_INPUT',
      'provide a name and an integer limit from 1 to 100'
    )
  }
  const request = CNContactFetchRequest.init(KEYS)
  request.predicate = CNContact.predicateForContactsMatchingName(text)
  request.sortOrder = 'userDefault'
  const found: ContactInfo[] = []
  try {
    CNContactStore.init().enumerateContacts(request, (contact, stop) => {
      found.push(readContact(contact))
      if (found.length >= limit) stop.value = true
    })
  } catch (error) {
    throw failure('search', 'E_CONTACTS_FETCH', detail(error, 'could not search contacts'))
  }
  return found
}

async function create(input: ContactInput): Promise<string> {
  assertUsage('create')
  assertAccess('create')
  const given = input.givenName.trim()
  const family = input.familyName.trim()
  if (!given && !family) {
    throw failure('create', 'E_CONTACTS_INPUT', 'provide a given or family name')
  }
  if (
    hasBlank(input.phoneNumbers) ||
    hasBlank(input.emailAddresses) ||
    !validPostalAddresses(input.postalAddresses ?? [])
  ) {
    throw failure(
      'create',
      'E_CONTACTS_INPUT',
      'phone, email, or postal address is invalid'
    )
  }
  const contact = CNMutableContact.init()
  contact.givenName = given
  contact.familyName = family
  contact.phoneNumbers = buildPhones(input.phoneNumbers, [])
  contact.emailAddresses = buildEmails(input.emailAddresses, [])
  contact.postalAddresses = buildAddresses(input.postalAddresses ?? [], [])
  const request = CNSaveRequest.init()
  request.addToContainerWithIdentifier(contact)
  try {
    CNContactStore.init().execute(request)
  } catch (error) {
    throw failure('create', 'E_CONTACTS_SAVE', detail(error, 'could not save the contact'))
  }
  return contact.identifier
}

async function update(identifier: string, changes: ContactChanges): Promise<ContactInfo> {
  assertUsage('update')
  assertAccess('update')
  if (
    !identifier.trim() ||
    (changes.givenName === undefined &&
      changes.familyName === undefined &&
      changes.phoneNumbers === undefined &&
      changes.emailAddresses === undefined &&
      changes.postalAddresses === undefined)
  ) {
    throw failure(
      'update',
      'E_CONTACTS_INPUT',
      'an identifier and at least one change are required'
    )
  }
  if (changes.phoneNumbers && hasBlank(changes.phoneNumbers)) {
    throw failure('update', 'E_CONTACTS_INPUT', 'phone numbers cannot be blank')
  }
  if (changes.emailAddresses && hasBlank(changes.emailAddresses)) {
    throw failure('update', 'E_CONTACTS_INPUT', 'email addresses cannot be blank')
  }
  if (changes.postalAddresses && !validPostalAddresses(changes.postalAddresses)) {
    throw failure('update', 'E_CONTACTS_INPUT', 'postal address is invalid')
  }
  const store = CNContactStore.init()
  let stored: CNContact
  try {
    stored = store.unifiedContact(identifier, KEYS)
  } catch (error) {
    throw saveFailure('update', 'E_CONTACTS_SAVE', error)
  }
  const contact = mutableCopyOf(stored)
  if (changes.givenName !== undefined || changes.familyName !== undefined) {
    const given = (changes.givenName ?? contact.givenName).trim()
    const family = (changes.familyName ?? contact.familyName).trim()
    if (!given && !family) {
      throw failure('update', 'E_CONTACTS_INPUT', 'provide a given or family name')
    }
  }
  if (changes.givenName !== undefined) contact.givenName = changes.givenName.trim()
  if (changes.familyName !== undefined) contact.familyName = changes.familyName.trim()
  if (changes.phoneNumbers) {
    contact.phoneNumbers = buildPhones(changes.phoneNumbers, contact.phoneNumbers)
  }
  if (changes.emailAddresses) {
    contact.emailAddresses = buildEmails(changes.emailAddresses, contact.emailAddresses)
  }
  if (changes.postalAddresses) {
    contact.postalAddresses = buildAddresses(
      changes.postalAddresses,
      contact.postalAddresses
    )
  }
  const request = CNSaveRequest.init()
  request.update(contact)
  try {
    store.execute(request)
  } catch (error) {
    throw saveFailure('update', 'E_CONTACTS_SAVE', error)
  }
  return readContact(contact)
}

async function remove(identifier: string): Promise<void> {
  assertUsage('delete')
  assertAccess('delete')
  if (!identifier.trim()) {
    throw failure('delete', 'E_CONTACTS_INPUT', 'identifier is required')
  }
  const store = CNContactStore.init()
  let stored: CNContact
  try {
    stored = store.unifiedContact(identifier, KEYS)
  } catch (error) {
    throw saveFailure('delete', 'E_CONTACTS_DELETE', error)
  }
  const request = CNSaveRequest.init()
  request.delete(mutableCopyOf(stored))
  try {
    store.execute(request)
  } catch (error) {
    throw saveFailure('delete', 'E_CONTACTS_DELETE', error)
  }
}

const backend = {
  getPermissionStatus,
  requestPermission,
  pickContact,
  search,
  create,
  update,
  remove,
} satisfies Omit<OneContacts, keyof HybridObject<{}>>

export function contactsNative() {
  return backend
}
