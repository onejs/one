import type { ContactInfo, ContactInput, ContactsPermissionStatus } from '../specs/OneContacts.nitro';
export type { ContactInfo, ContactInput, ContactsPermissionStatus };
declare function getPermissionStatus(): ContactsPermissionStatus;
declare function requestPermission(): Promise<ContactsPermissionStatus>;
declare function search(name: string, limit?: number): Promise<ContactInfo[]>;
declare function create(input: ContactInput): Promise<string>;
declare function deleteContact(identifier: string): Promise<void>;
export declare const Contacts: Readonly<{
    getPermissionStatus: typeof getPermissionStatus;
    requestPermission: typeof requestPermission;
    search: typeof search;
    create: typeof create;
    delete: typeof deleteContact;
}>;
//# sourceMappingURL=index.native.d.ts.map