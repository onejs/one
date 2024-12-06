import type { Endpoint } from 'one'
import { auth } from '~/config/better-auth/auth'

export const GET: Endpoint = (req) => {
  return auth.handler(req)
}

export const POST: Endpoint = (req) => {
  return auth.handler(req)
}
