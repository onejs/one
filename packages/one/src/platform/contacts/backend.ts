import { NitroModules } from 'react-native-nitro-modules'
import type { OneContacts } from '../specs/OneContacts.nitro'

let hybrid: OneContacts | undefined

export function contactsNative(): OneContacts {
  hybrid ??= NitroModules.createHybridObject<OneContacts>('OneContacts')
  return hybrid
}
