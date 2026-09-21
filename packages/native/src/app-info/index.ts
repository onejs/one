import type { AppInfo as AppInfoApi } from './types'

export type { AppInfoApi }

// web entry. no installed binary exists on web, so only the marketing
// version comes from the build-time manifest value one injects as a
// ONE_APP_VERSION define (see one-define-environment in one/vite). the read
// is a literal member expression, like ONE_APP_NAME elsewhere: vite define
// replaces only the static process.env.ONE_APP_VERSION text, so a dynamic
// lookup would stay null. build and application id have no honest web
// value, so they are null, never guessed. unset outside a one web build,
// where every field stays null. signatures stay identical to the native
// entry because the published declarations are built from this file and
// serve both platforms.
function asString(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null
}

export const AppInfo: AppInfoApi = Object.freeze({
  version: asString(process.env.ONE_APP_VERSION),
  build: null,
  applicationId: null,
})
