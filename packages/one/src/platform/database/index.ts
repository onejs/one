import type { open, openAsync } from '@op-engineering/op-sqlite'
import { openKeyValue } from './keyValue'

// browser sqlite belongs to a native build. named key-value stores persist
// here through localStorage, one namespace per name.
const openOnWeb: typeof open = () => {
  throw new Error('One.Database.open requires an iOS or Android build')
}

const openAsyncOnWeb: typeof openAsync = () => {
  return Promise.reject(new Error('One.Database.openAsync requires an iOS or Android build'))
}

export const Database: Readonly<{
  open: typeof open
  openAsync: typeof openAsync
  openKeyValue: typeof openKeyValue
}> = Object.freeze({
  open: openOnWeb,
  openAsync: openAsyncOnWeb,
  openKeyValue,
})
