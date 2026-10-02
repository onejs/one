import type { schema } from '~/data/generated/schema'
import type { AuthData } from '~/features/auth/types'
type Schema = typeof schema
declare module 'on-zero' {
  interface Config {
    schema: Schema
    authData: AuthData
  }
}
