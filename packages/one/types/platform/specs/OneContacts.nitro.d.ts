import type { HybridObject } from 'react-native-nitro-modules';
export type ContactsPermissionStatus = 'notDetermined' | 'restricted' | 'denied' | 'authorized' | 'limited';
export interface ContactPostalAddress {
    label: string;
    street: string;
    subLocality: string;
    city: string;
    subAdministrativeArea: string;
    state: string;
    postalCode: string;
    country: string;
    isoCountryCode: string;
}
export interface ContactPostalAddressInput {
    label?: string;
    street?: string;
    subLocality?: string;
    city?: string;
    subAdministrativeArea?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    isoCountryCode?: string;
}
export interface ContactInfo {
    identifier: string;
    givenName: string;
    familyName: string;
    phoneNumbers: string[];
    emailAddresses: string[];
    postalAddresses: ContactPostalAddress[];
}
export interface ContactInput {
    givenName: string;
    familyName: string;
    phoneNumbers: string[];
    emailAddresses: string[];
    postalAddresses?: ContactPostalAddressInput[];
}
export interface ContactChanges {
    givenName?: string;
    familyName?: string;
    phoneNumbers?: string[];
    emailAddresses?: string[];
    postalAddresses?: ContactPostalAddressInput[];
}
export interface OneContacts extends HybridObject<{
    ios: 'swift';
}> {
    getPermissionStatus(): ContactsPermissionStatus;
    requestPermission(): Promise<ContactsPermissionStatus>;
    search(name: string, limit: number): Promise<ContactInfo[]>;
    create(input: ContactInput): Promise<string>;
    update(identifier: string, changes: ContactChanges): Promise<ContactInfo>;
    remove(identifier: string): Promise<void>;
}
//# sourceMappingURL=OneContacts.nitro.d.ts.map