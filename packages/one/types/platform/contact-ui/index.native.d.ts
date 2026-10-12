import type { NativeCNContact } from '../specs/OneContactUI.nitro';
import type { CNContactValue, CNContactStoreValue, CNContactViewControllerOptions, CNContactViewControllerDelegate, CNKeyDescriptor } from './types';
export type * from './types';
declare class CNContact implements CNContactValue {
    protected native: NativeCNContact;
    constructor(native: NativeCNContact);
    get identifier(): string;
    get namePrefix(): string;
    get givenName(): string;
    get middleName(): string;
    get familyName(): string;
    get nameSuffix(): string;
    get nickname(): string;
    get organizationName(): string;
    get jobTitle(): string;
    isKeyAvailable(key: string): boolean;
    mutableCopy(): CNMutableContact;
}
export declare class CNMutableContact extends CNContact {
    constructor();
    get namePrefix(): string;
    set namePrefix(value: string);
    get givenName(): string;
    set givenName(value: string);
    get middleName(): string;
    set middleName(value: string);
    get familyName(): string;
    set familyName(value: string);
    get nameSuffix(): string;
    set nameSuffix(value: string);
    get nickname(): string;
    set nickname(value: string);
    get organizationName(): string;
    set organizationName(value: string);
    get jobTitle(): string;
    set jobTitle(value: string);
}
export declare class CNContactStore implements CNContactStoreValue {
    constructor();
    private get native();
    unifiedContact(options: {
        withIdentifier: string;
        keysToFetch: (string | CNKeyDescriptor)[];
    }): Promise<CNContact>;
}
export declare class CNContactViewController {
    static descriptorForRequiredKeys(): import("../specs/OneContactUI.nitro").NativeCNKeyDescriptor;
    private readonly native;
    delegate: CNContactViewControllerDelegate<CNContactViewController> | null;
    constructor(options: CNContactViewControllerOptions);
    get contact(): CNContact;
    get contactStore(): CNContactStore | undefined;
    set contactStore(value: CNContactStoreValue | undefined);
    get displayedPropertyKeys(): string[] | undefined;
    set displayedPropertyKeys(value: string[] | undefined);
    get alternateName(): string | undefined;
    set alternateName(value: string | undefined);
    get message(): string | undefined;
    set message(value: string | undefined);
    get allowsEditing(): boolean;
    set allowsEditing(value: boolean);
    get allowsActions(): boolean;
    set allowsActions(value: boolean);
    get shouldShowLinkedContacts(): boolean;
    set shouldShowLinkedContacts(value: boolean);
    highlightProperty(withKey: string, identifier?: string): void;
    present(animated?: boolean): Promise<void>;
    dismiss(animated?: boolean): Promise<void>;
}
export type { CNContact };
//# sourceMappingURL=index.native.d.ts.map