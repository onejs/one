import type { ContactChanges, ContactInfo, ContactInput, ContactsPermissionStatus } from '../specs/OneContacts.nitro';
declare function getPermissionStatus(): ContactsPermissionStatus;
declare function requestPermission(): Promise<ContactsPermissionStatus>;
declare function pickContact(): Promise<ContactInfo | undefined>;
declare function search(name: string, limit: number): Promise<ContactInfo[]>;
declare function create(input: ContactInput): Promise<string>;
declare function update(identifier: string, changes: ContactChanges): Promise<ContactInfo>;
declare function remove(identifier: string): Promise<void>;
export declare function contactsNative(): {
    getPermissionStatus: typeof getPermissionStatus;
    requestPermission: typeof requestPermission;
    pickContact: typeof pickContact;
    search: typeof search;
    create: typeof create;
    update: typeof update;
    remove: typeof remove;
};
export {};
//# sourceMappingURL=backend.sdk.d.ts.map