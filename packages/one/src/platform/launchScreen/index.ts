import { Cover } from './Cover'
import type {
  LaunchScreen as LaunchScreenApi,
  LaunchScreenCoverProps,
  LaunchScreenHideOptions,
} from './types'

export type { LaunchScreenApi, LaunchScreenCoverProps, LaunchScreenHideOptions }

// web entry: a page has no launch screen, so both verbs do nothing.
export const LaunchScreen: LaunchScreenApi = Object.freeze({
  preventAutoHide() {},
  hide() {},
  Cover,
  artworkWidth: null,
})
