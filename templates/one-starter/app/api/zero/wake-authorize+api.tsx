import type { Endpoint } from 'one'

export const POST: Endpoint = async () =>
  new Response('wake notifications are disabled', { status: 401 })
