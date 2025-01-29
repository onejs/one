import { prettyPrintResponse } from '../helpers/prettyPrintResponse'
import { auth } from './auth'

export function authAPIHandler(method: 'GET' | 'POST') {
  return async (req: Request) => {
    try {
      const res = await auth.handler(req)
      if (process.env.DEBUG) {
        console.info(`AUTH ${method}`, req.url)
        prettyPrintResponse(res)
      }
      return res
    } catch (err) {
      console.error(`Error: ${err}`)
      return new Response(`Error`, { status: 500 })
    }
  }
}
