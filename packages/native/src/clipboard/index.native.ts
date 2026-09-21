import { TurboModuleRegistry, type TurboModule } from 'react-native'
import { assertSetStringText } from './validate'

// string clipboard matching expo-clipboard's string api. the native module
// is resolved once and lazily; native owns all behavior.
interface ClipboardSpec extends TurboModule {
  getString(): Promise<string>
  setString(text: string): Promise<boolean>
  hasString(): Promise<boolean>
}

let nativeModule: ClipboardSpec | null | undefined

function native(): ClipboardSpec | null {
  if (nativeModule === undefined) {
    nativeModule = TurboModuleRegistry.get<ClipboardSpec>('OneNativeClipboard')
  }
  return nativeModule
}

function needNative(): Promise<never> {
  return Promise.reject(
    new Error('Clipboard needs a native build that includes @vxrn/native')
  )
}

function getString(): Promise<string> {
  const resolved = native()
  if (!resolved) return needNative()
  return resolved.getString()
}

function setString(text: string): Promise<boolean> {
  assertSetStringText(text)
  const resolved = native()
  if (!resolved) return needNative()
  return resolved.setString(text)
}

function hasString(): Promise<boolean> {
  const resolved = native()
  if (!resolved) return needNative()
  return resolved.hasString()
}

export const Clipboard = Object.freeze({ getString, setString, hasString })
