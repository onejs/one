import { NitroModules } from 'react-native-nitro-modules'
import type { OneDocumentPicker } from '../specs/OneDocumentPicker.nitro'

let hybrid: OneDocumentPicker | null | undefined

export function documentPickerNative(verb: string): OneDocumentPicker {
  if (hybrid === undefined) {
    hybrid = NitroModules.hasHybridObject('OneDocumentPicker')
      ? NitroModules.createHybridObject<OneDocumentPicker>('OneDocumentPicker') : null
  }
  if (!hybrid) throw new Error(`DocumentPicker.${verb} needs a native build`)
  return hybrid
}
