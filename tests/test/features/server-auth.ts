// this file imports a module that imports server-only (nested import)
import { serverOnlyUtil } from './server-only-util'

export function checkServerAuth() {
  return { authenticated: true, util: serverOnlyUtil() }
}
