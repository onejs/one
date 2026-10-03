import type { HybridObject } from 'react-native-nitro-modules'

// string clipboard behind One.Clipboard, matching expo-clipboard's string api.
// async because reading the pasteboard can raise the system paste prompt.
export interface OneClipboard extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  getString(): Promise<string>
  setString(text: string): Promise<boolean>
  hasString(): Promise<boolean>
}
