import type { Endpoint } from 'one'
import { auth } from '~/better-auth/auth'
import { prettyPrintResponse } from '~/helpers/prettyPrintResponse'

export const GET: Endpoint = async (req) => {
  const res = await auth.handler(req)
  console.info('AUTH GET', req.url)
  prettyPrintResponse(res)
  return res
}

export const POST: Endpoint = async (req) => {
  const res = await auth.handler(req)
  console.info('AUTH POST', req.url)
  prettyPrintResponse(res)
  return res
}
