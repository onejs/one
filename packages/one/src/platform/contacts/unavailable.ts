import { missingNativeBuild } from '../nativeError'
import type {
  ContactChanges,
  ContactInfo,
  ContactInput,
  ContactPostalAddress,
  ContactPostalAddressInput,
  ContactsPermissionStatus,
} from '../specs/OneContacts.nitro'

export type { ContactChanges, ContactInfo, ContactInput, ContactPostalAddress, ContactPostalAddressInput, ContactsPermissionStatus }

export const Contacts = Object.freeze({
  getPermissionStatus: (): ContactsPermissionStatus => 'denied',
  requestPermission: (): Promise<ContactsPermissionStatus> => Promise.resolve('denied'),
  pickContact: (): Promise<ContactInfo | undefined> => Promise.reject(missingNativeBuild('Contacts.pickContact')),
  search: (_name: string, _limit = 100): Promise<ContactInfo[]> => Promise.resolve([]),
  create: (_input: ContactInput): Promise<string> => Promise.reject(missingNativeBuild('Contacts.create')),
  update: (_identifier: string, _changes: ContactChanges): Promise<ContactInfo> => Promise.reject(missingNativeBuild('Contacts.update')),
  delete: (_identifier: string): Promise<void> => Promise.resolve(),
})
