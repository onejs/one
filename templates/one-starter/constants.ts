import { getURL } from 'one'

// brand
export { APP_NAME, APP_SCHEME } from './appIdentity'
import { APP_NAME } from './appIdentity'
export const APP_NAME_LOWERCASE = APP_NAME.toLowerCase()
// the one sentence under the name on the landing page
export const APP_TAGLINE =
  'Build for web and native with One, Tamagui, and live SQLite sync.'

// domain
export const DOMAIN = 'example.com'
export const ADMIN_EMAIL = `admin@${DOMAIN}`

// auth/demoIdentity is also imported by static seed data, so keep its identity
// exports separate from this module's runtime getURL dependency.
export { DEMO_EMAIL, DEMO_NAME, DEMO_PASSWORD, DEMO_USER_ID } from './auth/demoIdentity'

export const SERVER_URL = getURL()

// community
export const DISCORD_INVITE_URL = 'https://discord.gg/4qh6tdcVDa'
