import type { ContactChanges, ContactInfo, ContactInput, ContactPostalAddress, ContactPostalAddressInput, ContactsPermissionStatus } from '../specs/OneContacts.nitro';
export type { ContactChanges, ContactInfo, ContactInput, ContactPostalAddress, ContactPostalAddressInput, ContactsPermissionStatus };
export declare const Contacts: Readonly<{
    getPermissionStatus: () => ContactsPermissionStatus;
    requestPermission: () => Promise<ContactsPermissionStatus>;
    pickContact: () => Promise<ContactInfo | undefined>;
    search: (_name: string, _limit?: number) => Promise<ContactInfo[]>;
    create: (_input: ContactInput) => Promise<string>;
    update: (_identifier: string, _changes: ContactChanges) => Promise<ContactInfo>;
    delete: (_identifier: string) => Promise<void>;
}>;
//# sourceMappingURL=unavailable.d.ts.map