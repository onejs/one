import type { ContactInfo } from '../specs/OneContacts.nitro';
export type * from './unavailable';
export declare const Contacts: Readonly<{
    getPermissionStatus: () => import("./unavailable").ContactsPermissionStatus;
    requestPermission: () => Promise<import("./unavailable").ContactsPermissionStatus>;
    search: (_name: string, _limit?: number) => Promise<ContactInfo[]>;
    create: (_input: import("./unavailable").ContactInput) => Promise<string>;
    update: (_identifier: string, _changes: import("./unavailable").ContactChanges) => Promise<ContactInfo>;
    delete: (_identifier: string) => Promise<void>;
    pickContact: () => Promise<ContactInfo | undefined>;
}>;
//# sourceMappingURL=index.d.ts.map