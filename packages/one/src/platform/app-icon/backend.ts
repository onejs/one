import { NitroModules } from 'react-native-nitro-modules'
import type { OneAppIcon } from '../specs/OneAppIcon.nitro'

let hybrid: OneAppIcon | undefined

export function appIconNative() {
  return (hybrid ??= NitroModules.createHybridObject<OneAppIcon>('OneAppIcon'))
}
