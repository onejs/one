import { isResponse } from 'vxs'

export default () => {
  if (isResponse(global)) {
    return null
  }

  return {
    hello: 'world',
  }
}
