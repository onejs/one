import { readAppInfo } from './backend'
import type { AppInfo as AppInfoApi } from './types'

export type { AppInfoApi }

// installed-binary identity is read once and frozen for this process.
export const AppInfo: AppInfoApi = Object.freeze(readAppInfo())
