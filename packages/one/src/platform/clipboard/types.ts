// uniform clipboard types. the expo-clipboard module api is the reference
// shape so migration stays mechanical; function names are rewritten by the
// api-conventions fixed rule (async suffix dropped): getStringAsync is
// getString, addClipboardListener is addListener with the namespace noun
// dropped.
export type ClipboardContentType = 'plain-text' | 'image' | 'url' | 'html'

export type ClipboardStringFormat = 'plainText' | 'html'

export interface ClipboardGetStringOptions {
  // the target format of the string to retrieve, when possible.
  // defaults to 'plainText'.
  preferredFormat?: ClipboardStringFormat
}

export interface ClipboardSetStringOptions {
  // the input format of the provided string, so other apps interpret a
  // copied html string properly. defaults to 'plainText'.
  inputFormat?: ClipboardStringFormat
}

export interface ClipboardGetImageOptions {
  // the format to convert the clipboard image to.
  format: 'png' | 'jpeg'
  // quality of the returned image, 0 to 1. applies to jpeg only.
  // defaults to 1.
  jpegQuality?: number
}

export interface ClipboardImage {
  // base64-encoded image data, prepended with the data uri prefix
  // (data:image/png;base64, or data:image/jpeg;base64,), usable directly
  // as an Image source.
  data: string
  size: { width: number; height: number }
}

export interface ClipboardEvent {
  contentTypes: ClipboardContentType[]
}

export interface ClipboardSubscription {
  remove(): void
}
