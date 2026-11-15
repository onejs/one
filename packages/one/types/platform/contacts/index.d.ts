import type { ContactInfo } from '../specs/OneContacts.nitro.js';
export type * from './unavailable.js';
export declare const Contacts: Readonly<{
    getPermissionStatus: () => import("./unavailable.js").ContactsPermissionStatus;
    requestPermission: () => Promise<import("./unavailable.js").ContactsPermissionStatus>;
    search: (_name: string, _limit?: number) => Promise<ContactInfo[]>;
    create: (_input: import("./unavailable.js").ContactInput) => Promise<string>;
    update: (_identifier: string, _changes: import("./unavailable.js").ContactChanges) => Promise<ContactInfo>;
    delete: (_identifier: string) => Promise<void>;
    pickContact: () => Promise<ContactInfo | undefined>;
}>;
//# sourceMappingURL=index.d.ts.map