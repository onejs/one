import type { HybridObject } from 'react-native-nitro-modules'

export type ContactsPermissionStatus =
  | 'notDetermined'
  | 'restricted'
  | 'denied'
  | 'authorized'
  | 'limited'

export interface ContactInfo {
  identifier: string
  givenName: string
  familyName: string
  phoneNumbers: string[]
  emailAddresses: string[]
}

export interface ContactInput {
  givenName: string
  familyName: string
  phoneNumbers: string[]
  emailAddresses: string[]
}

export interface ContactChanges {
  givenName?: string
  familyName?: string
  phoneNumbers?: string[]
  emailAddresses?: string[]
}

export interface OneContacts extends HybridObject<{ ios: 'swift' }> {
  getPermissionStatus(): ContactsPermissionStatus
  requestPermission(): Promise<ContactsPermissionStatus>
  search(name: string, limit: number): Promise<ContactInfo[]>
  create(input: ContactInput): Promise<string>
  update(identifier: string, changes: ContactChanges): Promise<ContactInfo>
  remove(identifier: string): Promise<void>
}
