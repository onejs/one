import { isResponse } from 'vxs'
import { sharedFn } from '~/features/api/shared'

export default () => {
  if (!sharedFn()) {
    return null
  }

  if (isResponse(global)) {
    return null
  }

  return {
    hello: 'world',
  }
}
