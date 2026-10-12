import type { CNMutableContactValue, CNContactStoreValue, CNContactViewControllerOptions, CNContactViewControllerDelegate, CNKeyDescriptor, CNContactValue } from './types';
export type * from './types';
export type CNContact = CNContactValue;
export declare class CNMutableContact implements CNMutableContactValue {
    constructor();
    readonly identifier = "";
    namePrefix: string;
    givenName: string;
    middleName: string;
    familyName: string;
    nameSuffix: string;
    nickname: string;
    organizationName: string;
    jobTitle: string;
    isKeyAvailable(_key: string): boolean;
    mutableCopy(): CNMutableContact;
}
export declare class CNContactStore implements CNContactStoreValue {
    constructor();
    unifiedContact(_options: {
        withIdentifier: string;
        keysToFetch: (string | CNKeyDescriptor)[];
    }): Promise<CNContact>;
}
export declare class CNContactViewController {
    static descriptorForRequiredKeys(): CNKeyDescriptor;
    constructor(_options: CNContactViewControllerOptions);
    delegate: CNContactViewControllerDelegate<CNContactViewController> | null;
    get contact(): CNContact;
    contactStore: CNContactStoreValue | undefined;
    displayedPropertyKeys: string[] | undefined;
    alternateName: string | undefined;
    message: string | undefined;
    allowsEditing: boolean;
    allowsActions: boolean;
    shouldShowLinkedContacts: boolean;
    highlightProperty(_withKey: string, _identifier?: string): void;
    present(_animated?: boolean): Promise<void>;
    dismiss(_animated?: boolean): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map