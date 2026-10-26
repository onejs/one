import { NitroModules } from 'react-native-nitro-modules'
import type { OnePrint } from '../specs/OnePrint.nitro'

let hybrid: OnePrint | undefined

export function printNative(): OnePrint {
  hybrid ??= NitroModules.createHybridObject<OnePrint>('OnePrint')
  return hybrid
}
