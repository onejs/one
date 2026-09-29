import type {
  ContactInfo,
  ContactInput,
  ContactsPermissionStatus,
} from '../specs/OneContacts.nitro'

export type { ContactInfo, ContactInput, ContactsPermissionStatus }

const unsupported = (): never => {
  throw new Error('Contacts requires an iOS native build')
}

export const Contacts = Object.freeze({
  getPermissionStatus: (): ContactsPermissionStatus => unsupported(),
  requestPermission: (): Promise<ContactsPermissionStatus> => unsupported(),
  search: (_name: string, _limit = 100): Promise<ContactInfo[]> => unsupported(),
  create: (_input: ContactInput): Promise<string> => unsupported(),
  delete: (_identifier: string): Promise<void> => unsupported(),
})
