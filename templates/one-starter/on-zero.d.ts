// on-zero module augmentation — provides schema + authData types
import type { schema } from './data/generated/schema'

type Schema = typeof schema

type AuthData = {
  id: string
  email?: string
  role?: string
}

declare module 'on-zero' {
  interface Config {
    schema: Schema
    authData: AuthData
  }
}
