import type { Endpoint } from 'one'
import { auth } from '~/config/better-auth/auth'

export const GET: Endpoint = async (req) => {
  const res = await auth.handler(req)
  return res
}

export const POST: Endpoint = async (req) => {
  const res = await auth.handler(req)
  return res
}
