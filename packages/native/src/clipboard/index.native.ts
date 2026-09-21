import { TurboModuleRegistry, type TurboModule } from 'react-native'

// string-only clipboard matching expo-clipboard's string api. the native
// module is resolved once and lazily; native owns all behavior.
interface ClipboardSpec extends TurboModule {
  getString(): Promise<string>
  setString(text: string): Promise<boolean>
  hasString(): Promise<boolean>
}

let nativeModule: ClipboardSpec | null | undefined

function native(): ClipboardSpec {
  if (nativeModule === undefined) {
    nativeModule = TurboModuleRegistry.get<ClipboardSpec>('OneNativeClipboard')
  }
  if (!nativeModule) {
    throw new Error('OneNativeClipboard requires a native build with @vxrn/native installed')
  }
  return nativeModule
}

export async function getStringAsync(): Promise<string> {
  return native().getString()
}

export async function setStringAsync(text: string): Promise<boolean> {
  return native().setString(text)
}

export async function hasStringAsync(): Promise<boolean> {
  return native().hasString()
}
