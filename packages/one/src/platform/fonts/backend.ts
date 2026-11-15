import { NitroModules } from 'react-native-nitro-modules'
import type { OneFonts } from '../specs/OneFonts.nitro'

let hybrid: OneFonts | undefined

export function fontsNative(): OneFonts | null {
  if (!NitroModules.hasHybridObject('OneFonts')) return null
  hybrid ??= NitroModules.createHybridObject<OneFonts>('OneFonts')
  return hybrid
}
