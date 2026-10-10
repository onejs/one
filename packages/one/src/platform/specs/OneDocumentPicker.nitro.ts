import type { HybridObject } from 'react-native-nitro-modules'
import type { ResolvedDocumentPickerOptions } from '../document-picker/options'
import type { DocumentPickerAsset } from '../document-picker/types'

// the system document picker behind One.DocumentPicker, matching the
// expo-document-picker subset in ../document-picker/types. a pick settles one
// flat result whose assets are set only when not canceled, which the js entry
// narrows to the public union. one pick is in flight at a time.
export interface DocumentPickerNativeResult {
  canceled: boolean
  assets?: DocumentPickerAsset[]
}

export interface OneDocumentPicker extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  getDocument(options: ResolvedDocumentPickerOptions): Promise<DocumentPickerNativeResult>
}
