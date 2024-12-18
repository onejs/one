import type { Endpoint } from 'one'
import { auth } from '~/src/better-auth/auth'
import { prettyPrintResponse } from '~/src/helpers/prettyPrintResponse'

export const GET: Endpoint = async (req) => {
  const res = await auth.handler(req)
  if (process.env.DEBUG) {
    console.info('AUTH GET', req.url)
    prettyPrintResponse(res)
  }
  return res
}

export const POST: Endpoint = async (req) => {
  const res = await auth.handler(req)
  if (process.env.DEBUG) {
    console.info('AUTH POST', req.url)
    prettyPrintResponse(res)
  }
  return res
}
