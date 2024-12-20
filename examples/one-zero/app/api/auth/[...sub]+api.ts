import type { Endpoint } from 'one'
import { auth } from '~/better-auth/auth'

export const GET: Endpoint = async (req) => {
  return await auth.handler(req)
}

export const POST: Endpoint = async (req) => {
  return await auth.handler(req)
}
