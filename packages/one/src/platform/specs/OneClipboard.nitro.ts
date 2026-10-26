import type { HybridObject } from 'react-native-nitro-modules'

// clipboard behind One.Clipboard, matching expo-clipboard: strings with an
// optional html format, images as base64 data uris, urls, and a change
// listener. reads are async because reading the pasteboard can raise the
// system paste prompt. option formats stay strings (like the notification
// trigger type) so an unknown one still reaches native; the js entry
// validates first.
export interface ClipboardGetStringOptions {
  preferredFormat?: string
}

export interface ClipboardSetStringOptions {
  inputFormat?: string
}

export interface ClipboardSetStringOptions {
  inputFormat?: string
}

export interface ClipboardGetImageOptions {
  format: string
  jpegQuality?: number
}

export interface ClipboardImageResult {
  // base64 image data with the data uri prefix (data:image/png;base64, or
  // data:image/jpeg;base64,), usable directly as an Image source.
  data: string
  width: number
  height: number
}

export interface OneClipboard extends HybridObject<{ android: 'kotlin' }> {
  getString(options: ClipboardGetStringOptions): Promise<string>
  setString(text: string, options: ClipboardSetStringOptions): Promise<boolean>
  hasString(): Promise<boolean>
  getImage(options: ClipboardGetImageOptions): Promise<ClipboardImageResult | undefined>
  setImage(base64Image: string): Promise<void>
  hasImage(): Promise<boolean>
  getUrl(): Promise<string | undefined>
  setUrl(url: string): Promise<void>
  hasUrl(): Promise<boolean>
  // one native listener slot, fanned out to js listeners by the js entry:
  // installed on the first addListener, cleared on the last remove.
  setClipboardListener(listener: (contentTypes: string[]) => void): void
  clearClipboardListener(): void
}
