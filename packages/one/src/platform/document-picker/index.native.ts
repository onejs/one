import { NitroModules } from 'react-native-nitro-modules'
import type {
  DocumentPickerNativeResult,
  OneDocumentPicker,
} from '../specs/OneDocumentPicker.nitro'
import { rethrowNativeError } from '../nativeError'
import { resolveDocumentPickerOptions } from './options'
import type { DocumentPickerOptions, DocumentPickerResult } from './types'

export type * from './types'

// the OneDocumentPicker nitro hybrid object is created once and lazily. null
// outside a native build, exactly like the other native modules in
// this package.
let hybrid: OneDocumentPicker | null | undefined

function native(verb: string): OneDocumentPicker {
  if (hybrid === undefined) {
    hybrid = NitroModules.hasHybridObject('OneDocumentPicker')
      ? NitroModules.createHybridObject<OneDocumentPicker>('OneDocumentPicker')
      : null
  }
  if (!hybrid) {
    throw new Error(`DocumentPicker.${verb} needs a native build`)
  }
  return hybrid
}

// native settles one flat result; assets are set only when not canceled.
function toResult(result: DocumentPickerNativeResult): DocumentPickerResult {
  if (result.canceled) return { canceled: true, assets: null }
  if (!result.assets) {
    throw new Error('DocumentPicker: native returned a pick without assets')
  }
  return { canceled: false, assets: result.assets }
}

// present the system document picker: UIDocumentPickerViewController on ios,
// ACTION_OPEN_DOCUMENT on android. picked files are copied into the app cache
// and returned as file uris, readable with fetch(uri). backing out resolves
// { canceled: true, assets: null }. plain, not async, so bad options throw
// synchronously; the one-in-flight slot lives in native.
function getDocument(options: DocumentPickerOptions = {}): Promise<DocumentPickerResult> {
  const resolved = resolveDocumentPickerOptions(options)
  return native('getDocument').getDocument(resolved).then(toResult, rethrowNativeError)
}

export const DocumentPicker = Object.freeze({
  getDocument,
})
