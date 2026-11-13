import type { readAppInfo } from './backend'
import type { AppInfo as AppInfoApi } from './types'

export type { AppInfoApi }

// installed-binary identity is read once on first access and frozen for this
// process; the ios backend evaluates its framework bindings on load.
let info: AppInfoApi | undefined
const read: typeof readAppInfo = () => (info ??= require('./backend').readAppInfo())

export const AppInfo: AppInfoApi = Object.freeze({
  get version() {
    return read().version
  },
  get build() {
    return read().build
  },
  get applicationId() {
    return read().applicationId
  },
})
