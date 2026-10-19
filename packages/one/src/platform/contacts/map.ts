import type {
  ContactPostalAddressInput,
  ContactsPermissionStatus,
} from '../specs/OneContacts.nitro'

// mirrors the old contacts hybrid validation so every entry point rejects the
// same inputs with the same codes before touching the native store.
export function hasBlank(values: string[]): boolean {
  return values.some((value) => !value.trim())
}

export function validSearch(name: string, limit: number): boolean {
  return (
    name.trim().length > 0 &&
    Number.isFinite(limit) &&
    limit >= 1 &&
    limit <= 100 &&
    Math.round(limit) === limit
  )
}

export function validPostalAddresses(values: ContactPostalAddressInput[]): boolean {
  return !values.some((value) => {
    const fields = [
      value.street,
      value.subLocality,
      value.city,
      value.subAdministrativeArea,
      value.state,
      value.postalCode,
      value.country,
      value.isoCountryCode,
    ]
    return (
      value.label?.trim() === '' ||
      !fields.some((field) => (field ?? '').trim() !== '')
    )
  })
}

// the native status carries every case the old switch handled; the iOS 18
// availability gate around limited is vacuous here because the runtime cannot
// return a case the running OS does not define.
export function mapPermissionStatus(value: string): ContactsPermissionStatus {
  switch (value) {
    case 'notDetermined':
    case 'restricted':
    case 'denied':
    case 'authorized':
    case 'limited':
      return value
    default:
      return 'restricted'
  }
}
