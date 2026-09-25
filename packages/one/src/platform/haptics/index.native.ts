import { NitroModules } from 'react-native-nitro-modules'
import type { OneHaptics } from '../specs/OneHaptics.nitro'
import type { HapticImpact, HapticNotification, Haptics as HapticsApi } from './types'
import { assertImpact, assertNotification } from './validation'

export type { HapticImpact, HapticNotification, HapticsApi }

// the OneHaptics nitro hybrid object, created on first use and cached. calls
// are sync JSI, so a gesture handler firing at threshold rates never waits
// on a bridge.
let hybrid: OneHaptics | undefined

function native(): OneHaptics {
  hybrid ??= NitroModules.createHybridObject<OneHaptics>('OneHaptics')
  return hybrid
}

// fire-and-forget: haptics have no meaningful completion. unknown style/type
// strings throw at this JS boundary before reaching native.
export const Haptics: HapticsApi = Object.freeze({
  selection() {
    native().selection()
  },

  impact(style: HapticImpact) {
    assertImpact(style)
    native().impact(style)
  },

  notification(type: HapticNotification) {
    assertNotification(type)
    native().notification(type)
  },
})
