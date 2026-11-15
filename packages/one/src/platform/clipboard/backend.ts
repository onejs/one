import { NitroModules } from 'react-native-nitro-modules'
import type { OneClipboard } from '../specs/OneClipboard.nitro'

let hybrid: OneClipboard | undefined

export function clipboardNative(): OneClipboard {
  hybrid ??= NitroModules.createHybridObject<OneClipboard>('OneClipboard')
  return hybrid
}
