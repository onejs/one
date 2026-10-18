import { documentPickerNative as native } from './backend'
import type {
  DocumentPickerNativeResult,
} from '../specs/OneDocumentPicker.nitro'
import { rethrowNativeError } from '../nativeError'
import { resolveDocumentPickerOptions } from './options'
import type { DocumentPickerOptions, DocumentPickerResult } from './types'

export type * from './types'

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
