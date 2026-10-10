import { Contacts as unavailable } from './unavailable'
import type { ContactInfo } from '../specs/OneContacts.nitro'
export type * from './unavailable'
type PickerContact = {
  name?: string[]
  tel?: string[]
  email?: string[]
  address?: PaymentAddress[]
}
type Picker = {
  getProperties(): Promise<string[]>
  select(properties: string[], options: { multiple: boolean }): Promise<PickerContact[]>
}
function picker(): Picker | undefined {
  return typeof window === 'undefined'
    ? undefined
    : (navigator as Navigator & { contacts?: Picker }).contacts
}
let busy = false
export const Contacts = Object.freeze({
  ...unavailable,
  pickContact: async (): Promise<ContactInfo | undefined> => {
    const contacts = picker()
    if (!contacts) return unavailable.pickContact()
    if (busy) throw new Error('Contacts.pickContact: a picker is already open')
    busy = true
    try {
      const supported = await contacts.getProperties()
      const fields = ['name', 'tel', 'email', 'address'].filter((field) =>
        supported.includes(field)
      )
      const [contact] = await contacts.select(fields, { multiple: false })
      if (!contact) return undefined
      // the picker exposes a display name, never an address-book identifier.
      return {
        identifier: '',
        givenName: contact.name?.[0] ?? '',
        familyName: '',
        phoneNumbers: contact.tel ?? [],
        emailAddresses: contact.email ?? [],
        postalAddresses: (contact.address ?? []).map((address) => ({
          label: '',
          street: address.addressLine.join('\n'),
          subLocality: '',
          city: address.city,
          subAdministrativeArea: '',
          state: address.region,
          postalCode: address.postalCode,
          country: '',
          isoCountryCode: address.country,
        })),
      }
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') return undefined
      throw error
    } finally {
      busy = false
    }
  },
})
