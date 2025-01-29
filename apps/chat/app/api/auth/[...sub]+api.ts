import type { Endpoint } from 'one'
import { auth } from '~/better-auth/auth'
import { prettyPrintResponse } from '~/helpers/prettyPrintResponse'

export const GET: Endpoint = async (req) => {
  try {
    const res = await auth.handler(req)
    if (process.env.DEBUG) {
      console.info('AUTH GET', req.url)
      prettyPrintResponse(res)
    }
    return res
  } catch (err) {
    console.error(`Error: ${err}`)
    return new Response(`Error`, { status: 500 })
  }
}

export const POST: Endpoint = async (req) => {
  try {
    const res = await auth.handler(req)
    if (process.env.DEBUG) {
      console.info('AUTH POST', req.url)
      prettyPrintResponse(res)
    }
    return res
  } catch (err) {
    console.error(`Error: ${err}`)
    return new Response(`Error`, { status: 500 })
  }
}
