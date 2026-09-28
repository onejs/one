import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type {
  ContactChanges,
  ContactInfo,
  ContactInput,
  ContactPostalAddress,
  ContactPostalAddressInput,
  ContactsPermissionStatus,
  OneContacts,
} from '../specs/OneContacts.nitro'

export type { ContactChanges, ContactInfo, ContactInput, ContactPostalAddress, ContactPostalAddressInput, ContactsPermissionStatus }

let hybrid: OneContacts | undefined

function native(): OneContacts {
  if (Platform.OS !== 'ios') throw new Error('Contacts requires an iOS native build')
  hybrid ??= NitroModules.createHybridObject<OneContacts>('OneContacts')
  return hybrid
}

function getPermissionStatus(): ContactsPermissionStatus {
  try {
    return native().getPermissionStatus()
  } catch (error) {
    return rethrowNativeError(error)
  }
}

function requestPermission(): Promise<ContactsPermissionStatus> {
  return native().requestPermission().catch(rethrowNativeError)
}

function search(name: string, limit = 100): Promise<ContactInfo[]> {
  return native().search(name, limit).catch(rethrowNativeError)
}

function create(input: ContactInput): Promise<string> {
  return native().create(input).catch(rethrowNativeError)
}

function update(identifier: string, changes: ContactChanges): Promise<ContactInfo> {
  return native().update(identifier, changes).catch(rethrowNativeError)
}

function deleteContact(identifier: string): Promise<void> {
  return native().remove(identifier).catch(rethrowNativeError)
}

export const Contacts = Object.freeze({
  getPermissionStatus,
  requestPermission,
  search,
  create,
  update,
  delete: deleteContact,
})
