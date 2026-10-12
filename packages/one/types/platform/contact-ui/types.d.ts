import type { NativeCNKeyDescriptor } from '../specs/OneContactUI.nitro';
export type CNKeyDescriptor = NativeCNKeyDescriptor;
export interface CNContactValue {
    readonly identifier: string;
    readonly namePrefix: string;
    readonly givenName: string;
    readonly middleName: string;
    readonly familyName: string;
    readonly nameSuffix: string;
    readonly nickname: string;
    readonly organizationName: string;
    readonly jobTitle: string;
    isKeyAvailable(key: string): boolean;
    mutableCopy(): CNMutableContactValue;
}
export interface CNMutableContactValue extends CNContactValue {
    namePrefix: string;
    givenName: string;
    middleName: string;
    familyName: string;
    nameSuffix: string;
    nickname: string;
    organizationName: string;
    jobTitle: string;
}
export interface CNContactFetchOptions {
    withIdentifier: string;
    keysToFetch: (string | CNKeyDescriptor)[];
}
export interface CNContactStoreValue {
    unifiedContact(options: CNContactFetchOptions): Promise<CNContactValue>;
}
export type CNContactViewControllerOptions = {
    forContact: CNContactValue;
} | {
    forUnknownContact: CNContactValue;
} | {
    forNewContact: CNContactValue | undefined;
};
export interface CNContactViewControllerDelegate<Controller = CNContactController> {
    contactViewController?(viewController: Controller, result: {
        didCompleteWith: CNContactValue | undefined;
    }): void;
}
export interface CNContactController {
    readonly contact: CNContactValue;
    delegate: CNContactViewControllerDelegate | null;
    contactStore: CNContactStoreValue | undefined;
    displayedPropertyKeys: string[] | undefined;
    alternateName: string | undefined;
    message: string | undefined;
    allowsEditing: boolean;
    allowsActions: boolean;
    shouldShowLinkedContacts: boolean;
    highlightProperty(withKey: string, identifier?: string): void;
    present(animated?: boolean): Promise<void>;
    dismiss(animated?: boolean): Promise<void>;
}
//# sourceMappingURL=types.d.ts.map