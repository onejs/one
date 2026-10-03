import { authServer } from '~/auth/server/authServer'
import { getZeroAuthData } from '~/auth/server/getZeroAuthData'
import { zeroBindings } from '~/data/zero-server'
import type { Endpoint } from 'one'

export const POST: Endpoint = async (request) => {
  try {
    const authData = await getZeroAuthData(authServer, request)

    const response = await zeroBindings.transformQueryRequest({
      authData,
      request,
    })
    const body = Array.isArray(response) ? { queries: response } : response
    return Response.json({ queryTransformVersion: 0, ...body })
  } catch (err) {
    console.error('[zero:pull] error', err)
    return new Response('internal error', { status: 500 })
  }
}
