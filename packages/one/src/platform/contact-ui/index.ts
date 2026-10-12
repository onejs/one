import type {
  CNMutableContactValue,
  CNContactStoreValue,
  CNContactViewControllerOptions,
  CNContactViewControllerDelegate,
  CNKeyDescriptor,
  CNContactValue,
} from './types'
export type * from './types'
export type CNContact = CNContactValue
function unavailable(): never {
  throw new Error('ContactsUI needs an iOS build')
}
export class CNMutableContact implements CNMutableContactValue {
  constructor() {
    unavailable()
  }
  readonly identifier = ''
  namePrefix = ''
  givenName = ''
  middleName = ''
  familyName = ''
  nameSuffix = ''
  nickname = ''
  organizationName = ''
  jobTitle = ''
  isKeyAvailable(_key: string): boolean {
    return unavailable()
  }
  mutableCopy(): CNMutableContact {
    return unavailable()
  }
}
export class CNContactStore implements CNContactStoreValue {
  constructor() {
    unavailable()
  }
  async unifiedContact(_options: {
    withIdentifier: string
    keysToFetch: (string | CNKeyDescriptor)[]
  }): Promise<CNContact> {
    return unavailable()
  }
}
export class CNContactViewController {
  static descriptorForRequiredKeys(): CNKeyDescriptor {
    return unavailable()
  }
  constructor(_options: CNContactViewControllerOptions) {
    unavailable()
  }
  delegate: CNContactViewControllerDelegate<CNContactViewController> | null = null
  get contact(): CNContact {
    return unavailable()
  }
  contactStore: CNContactStoreValue | undefined
  displayedPropertyKeys: string[] | undefined
  alternateName: string | undefined
  message: string | undefined
  allowsEditing = true
  allowsActions = true
  shouldShowLinkedContacts = false
  highlightProperty(_withKey: string, _identifier?: string): void {
    unavailable()
  }
  async present(_animated = true): Promise<void> {
    unavailable()
  }
  async dismiss(_animated = true): Promise<void> {
    unavailable()
  }
}
