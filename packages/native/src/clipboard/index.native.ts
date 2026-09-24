import { NitroModules } from 'react-native-nitro-modules'
import type { OneClipboard } from '../specs/OneClipboard.nitro'
import { assertSetStringText } from './validate'

// string clipboard matching expo-clipboard's string api, backed by the
// OneClipboard nitro hybrid object (created on first use and cached). native
// owns all behavior.
let hybrid: OneClipboard | undefined

function native(): OneClipboard {
  hybrid ??= NitroModules.createHybridObject<OneClipboard>('OneClipboard')
  return hybrid
}

function getString(): Promise<string> {
  return native().getString()
}

function setString(text: string): Promise<boolean> {
  assertSetStringText(text)
  return native().setString(text)
}

function hasString(): Promise<boolean> {
  return native().hasString()
}

export const Clipboard = Object.freeze({ getString, setString, hasString })
