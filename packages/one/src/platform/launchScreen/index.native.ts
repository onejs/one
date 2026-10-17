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

  Cover,
  artworkWidth: readLaunchScreenConfig()?.width ?? null,
})
