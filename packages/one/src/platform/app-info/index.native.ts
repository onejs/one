import { readAppInfo } from './backend'
import type { AppInfo as AppInfoApi } from './types'

export type { AppInfoApi }

// installed-binary identity is read once, on first access, and frozen for this process.
let info: AppInfoApi | undefined
const read = () => (info ??= readAppInfo())

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
