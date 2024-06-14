import { setCurrentRequestHeaders } from 'vxs/headers'

export function GET(request: Request) {
  // just to test importing node stuff
  setCurrentRequestHeaders((headers) => {
    headers.set('test-this-out', 'hi mom')
  })
  return { hello: 'world' }
}
