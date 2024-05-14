import { setCurrentRequestHeaders } from 'vxs/headers'

export function GET(request: Request) {
  setCurrentRequestHeaders((headers) => {
    // just to test importing node stuff
  })
  return { hello: 'world' }
}
