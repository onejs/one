import { ensureEnv } from '@o/helpers'
export const BETTER_AUTH_SECRET = ensureEnv('BETTER_AUTH_SECRET')
export const BETTER_AUTH_URL = ensureEnv('BETTER_AUTH_URL')
export const ZERO_UPSTREAM_DB = process.env['ZERO_UPSTREAM_DB'] || ''
export const ZERO_CVR_DB = process.env['ZERO_CVR_DB'] || ''
export const ZERO_CHANGE_DB = process.env['ZERO_CHANGE_DB'] || ''
