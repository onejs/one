// uniform document picker types. the expo-document-picker module api is the
// reference shape so migration stays mechanical; this is the small subset one
// supports: options are type and multiple, and picked files are always copied
// into the app cache.

export interface DocumentPickerAsset {
  // file uri of the picked file, copied into the app cache
  uri: string
  // the file's display name as the provider reported it
  name: string
  mimeType?: string
  // size in bytes of the cached file
  size?: number
}

export interface DocumentPickerSuccessResult {
  canceled: false
  assets: DocumentPickerAsset[]
}

export interface DocumentPickerCanceledResult {
  canceled: true
  assets: null
}

export type DocumentPickerResult = DocumentPickerSuccessResult | DocumentPickerCanceledResult

export interface DocumentPickerOptions {
  // mime types to offer, exact ('application/pdf') or wildcard ('image/*').
  // defaults to '*/*'
  type?: string | string[]
  // allow picking more than one file. defaults to false
  multiple?: boolean
}
