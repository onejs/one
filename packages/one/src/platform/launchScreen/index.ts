import type { LaunchScreen as LaunchScreenApi, LaunchScreenHideOptions } from './types'

export type { LaunchScreenApi, LaunchScreenHideOptions }

// web entry: a page has no launch screen, so both verbs do nothing.
export const LaunchScreen: LaunchScreenApi = Object.freeze({
  preventAutoHide() {},
  hide() {},
})
