import { open, openAsync } from '@op-engineering/op-sqlite'

export const Database: Readonly<{ open: typeof open; openAsync: typeof openAsync }> =
  Object.freeze({ open, openAsync })
