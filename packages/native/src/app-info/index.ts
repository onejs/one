import type { AppInfo as AppInfoApi } from './types'

export type { AppInfoApi }

// web entry. no installed binary exists on web, so the fields come from the
// build-time manifest values one injects as ONE_APP_* defines (see
// one-define-environment in one/vite). unset outside a one web build, where
// every field stays null. signatures stay identical to the native entry
// because the published declarations are built from this file and serve
// both platforms.
function readEnv(name: string): string | null {
  const value =
    typeof process !== 'undefined' ? process.env[name] : undefined
  return typeof value === 'string' && value !== '' ? value : null
}

export const AppInfo: AppInfoApi = Object.freeze({
  version: readEnv('ONE_APP_VERSION'),
  build: readEnv('ONE_APP_BUILD'),
  applicationId: readEnv('ONE_APP_APPLICATION_ID'),
})
