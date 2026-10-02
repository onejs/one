import { getAuthDataFromRequest } from '@o/better-auth-utils/server'
import type { Endpoint } from 'one'
import { authServer } from '~/features/auth/server/authServer'
import { zeroBindings } from '~/zero/server'
export const POST: Endpoint = async (request) => {
  const authData = await getAuthDataFromRequest(authServer, request)
  const response = await zeroBindings.transformQueryRequest({
    authData,
    request,
  })
  return Response.json(response)
}
