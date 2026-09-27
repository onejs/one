import { NitroModules } from 'react-native-nitro-modules'
import type { OneLaunchScreen } from '../specs/OneLaunchScreen.nitro'
import type { LaunchScreen as LaunchScreenApi, LaunchScreenHideOptions } from './types'

export type { LaunchScreenApi, LaunchScreenHideOptions }

let hybrid: OneLaunchScreen | undefined

function native(): OneLaunchScreen {
  hybrid ??= NitroModules.createHybridObject<OneLaunchScreen>('OneLaunchScreen')
  return hybrid
}

export const LaunchScreen: LaunchScreenApi = Object.freeze({
  preventAutoHide() {
    native().preventAutoHide()
  },

  hide(options?: LaunchScreenHideOptions) {
    native().hide(options?.fade ?? false)
  },
})
