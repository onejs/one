import { name } from './package.json' with { type: 'json' }

export const APP_NAME = name.replace(
  /(^|[^a-z0-9]+)([a-z0-9])/gi,
  (_, _separator, letter) => letter.toUpperCase(),
)
export const APP_SCHEME = `app-${name.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}`
export const APP_ID = `dev.onejs.app${name.replace(/[^a-z0-9]/gi, '')}`
