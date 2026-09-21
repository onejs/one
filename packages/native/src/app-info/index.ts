import type { AppInfo as AppInfoApi } from './types'

export type { AppInfoApi }

// web entry. no installed binary exists on web, so the fields come from the
// build-time manifest values one injects as ONE_APP_* defines (see
// one-define-environment in one/vite). the reads are literal member
// expressions, like ONE_APP_NAME elsewhere: vite define replaces only the
// static process.env.ONE_APP_* text, so a dynamic lookup would stay null.
// unset outside a one web build, where every field stays null. signatures
// stay identical to the native entry because the published declarations are
// built from this file and serve both platforms.
function asString(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null
}

export const AppInfo: AppInfoApi = Object.freeze({
  version: asString(process.env.ONE_APP_VERSION),
  build: asString(process.env.ONE_APP_BUILD),
  applicationId: asString(process.env.ONE_APP_APPLICATION_ID),
})
