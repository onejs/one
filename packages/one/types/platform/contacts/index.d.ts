import type { ContactInfo, ContactInput, ContactsPermissionStatus } from '../specs/OneContacts.nitro';
export type { ContactInfo, ContactInput, ContactsPermissionStatus };
export declare const Contacts: Readonly<{
    getPermissionStatus: () => ContactsPermissionStatus;
    requestPermission: () => Promise<ContactsPermissionStatus>;
    search: (_name: string, _limit?: number) => Promise<ContactInfo[]>;
    create: (_input: ContactInput) => Promise<string>;
    delete: (_identifier: string) => Promise<void>;
}>;
//# sourceMappingURL=index.d.ts.map