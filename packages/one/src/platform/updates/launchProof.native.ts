import { NitroModules } from 'react-native-nitro-modules'
import type { OneUpdates } from '../specs/OneUpdates.nitro'
import { Updates } from './index.native'

// a downloaded update counts as good only once the root layout commits; until
// then native keeps the launch armed, so a root render error rolls it back.
let proven = false

export function markLaunchSuccessful() {
  if (proven || !Updates.isEnabled) return
  proven = true
  NitroModules.createHybridObject<OneUpdates>('OneUpdates').markLaunchSuccessful()
}

export function launchCanRollBack() {
  return Updates.isEnabled && !Updates.isEmbeddedLaunch && !proven
}
