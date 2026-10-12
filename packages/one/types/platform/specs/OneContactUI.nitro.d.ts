import type { HybridObject } from 'react-native-nitro-modules';
export type ContactUINameKey = 'namePrefix' | 'givenName' | 'middleName' | 'familyName' | 'nameSuffix' | 'nickname' | 'organizationName' | 'jobTitle';
export type ContactUIMode = 'contact' | 'unknownContact' | 'newContact';
export interface NativeCNContact extends HybridObject<{
    ios: 'swift';
}> {
    readonly identifier: string;
    getName(key: ContactUINameKey): string;
    isKeyAvailable(key: string): boolean;
    mutableCopy(): NativeCNContact;
    setName(key: ContactUINameKey, value: string): void;
}
export interface NativeCNKeyDescriptor extends HybridObject<{
    ios: 'swift';
}> {
    readonly hash: number;
}
export interface NativeCNContactStore extends HybridObject<{
    ios: 'swift';
}> {
    unifiedContact(withIdentifier: string, keys: string[], descriptors: NativeCNKeyDescriptor[]): Promise<NativeCNContact>;
}
export interface OneContactUI extends HybridObject<{
    ios: 'swift';
}> {
    descriptorForRequiredKeys(): NativeCNKeyDescriptor;
    configure(mode: ContactUIMode, contact: NativeCNContact | undefined): void;
    readonly contact: NativeCNContact;
    displayedPropertyKeys?: string[];
    getContactStore(): NativeCNContactStore | undefined;
    setContactStore(store: NativeCNContactStore | undefined): void;
    alternateName?: string;
    message?: string;
    allowsEditing: boolean;
    allowsActions: boolean;
    shouldShowLinkedContacts: boolean;
    highlightProperty(withKey: string, identifier: string | undefined): void;
    present(animated: boolean, didComplete: (contact: NativeCNContact | undefined) => void): Promise<void>;
    dismiss(animated: boolean): Promise<void>;
}
//# sourceMappingURL=OneContactUI.nitro.d.ts.map