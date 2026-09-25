import type { DocumentPickerOptions } from './types'

// resolved options, the contract the native getDocument accepts.
export interface ResolvedDocumentPickerOptions {
  types: string[]
  multiple: boolean
}

// normalize and validate options. shared by the native and web entries so
// both reject the same bad input before touching any picker.
export function resolveDocumentPickerOptions(
  options: DocumentPickerOptions = {}
): ResolvedDocumentPickerOptions {
  const { type = '*/*', multiple = false } = options
  const list = Array.isArray(type) ? type : [type]
  if (list.length === 0) {
    throw new Error('DocumentPicker type must list at least one mime type')
  }
  for (const mimeType of list) {
    if (typeof mimeType !== 'string' || !/^[^\s/]+\/[^\s/]+$/.test(mimeType)) {
      throw new Error(
        `DocumentPicker type must be a mime type like 'application/pdf' or 'image/*', got '${String(mimeType)}'`
      )
    }
  }
  if (typeof multiple !== 'boolean') {
    throw new Error(`DocumentPicker multiple must be a boolean, got '${String(multiple)}'`)
  }
  return { types: [...new Set(list.map((mimeType) => mimeType.toLowerCase()))], multiple }
}
