import { NitroModules } from 'react-native-nitro-modules'
import type { OneAudio } from '../specs/OneAudio.nitro'

// one cached hybrid shared by the singleton functions and the player
// instances, so all audio state lives on one native module.
let hybrid: OneAudio | undefined

export function audioNative(): OneAudio {
  hybrid ??= NitroModules.createHybridObject<OneAudio>('OneAudio')
  return hybrid
}
