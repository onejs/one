import { createMiddleware } from 'one'
import { setResponseHeaders } from 'one/server'

export default createMiddleware((req) => {
  setResponseHeaders((headers) => {
    headers.append('test-header', 'value')
  })
})
