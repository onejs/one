import type { Hono } from 'hono'
import { handle } from 'hono/vercel'
import type { VXRNOptionsFilled } from '../utils/getOptionsFilled'

export async function honoServeVercel(app: Hono, options: VXRNOptionsFilled) {
  const handler = handle(app)
  const GET = handler
  const POST = handler
  const PATCH = handler
  const PUT = handler
  const OPTIONS = handler

  return {
    handler,
    GET,
    POST,
    PATCH,
    PUT,
    OPTIONS,
  }
}
