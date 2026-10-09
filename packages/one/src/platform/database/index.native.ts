import { open, openAsync } from '@op-engineering/op-sqlite'
import { openKeyValue } from './keyValue.native'

export const Database: Readonly<{
  open: typeof open
  openAsync: typeof openAsync
  openKeyValue: typeof openKeyValue
}> = Object.freeze({ open, openAsync, openKeyValue })
