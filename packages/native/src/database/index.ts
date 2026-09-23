import type { open, openAsync } from '@op-engineering/op-sqlite'

// browser persistence belongs to the caller's web storage provider.
const openOnWeb: typeof open = () => {
  throw new Error('One.Database.open requires an iOS or Android build')
}

const openAsyncOnWeb: typeof openAsync = () => {
  return Promise.reject(new Error('One.Database.openAsync requires an iOS or Android build'))
}

export const Database: Readonly<{ open: typeof open; openAsync: typeof openAsync }> = Object.freeze({
  open: openOnWeb,
  openAsync: openAsyncOnWeb,
})
