import { NitroModules } from 'react-native-nitro-modules'
import { Cover } from './Cover.native'
import { readLaunchScreenConfig } from './config'
import type { OneLaunchScreen } from '../specs/OneLaunchScreen.nitro'
import type {
  LaunchScreen as LaunchScreenApi,
  LaunchScreenCoverProps,
  LaunchScreenHideOptions,
} from './types'

export type { LaunchScreenApi, LaunchScreenCoverProps, LaunchScreenHideOptions }

let hybrid: OneLaunchScreen | undefined
let appHolds = false

function native(): OneLaunchScreen {
  hybrid ??= NitroModules.createHybridObject<OneLaunchScreen>('OneLaunchScreen')
  return hybrid
}

export const LaunchScreen: LaunchScreenApi = Object.freeze({
  preventAutoHide() {
    appHolds = true
    native().preventAutoHide()
  },

  hide(options?: LaunchScreenHideOptions) {
    native().hide(options?.fade ?? false)
  },

  Cover,
  artworkWidth: readLaunchScreenConfig()?.width ?? null,
})

// an app built without one's native module has no launch screen to hold.
export function holdLaunchScreenForRouter(): boolean {
  if (!NitroModules.hasHybridObject('OneLaunchScreen')) return false
  native().preventAutoHide()
  return true
}

export function releaseLaunchScreenForRouter() {
  if (!appHolds) native().hide(false)
}
