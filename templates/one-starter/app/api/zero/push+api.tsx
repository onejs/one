import { getAuthDataFromRequest } from '@o/better-auth-utils/server'
import type { Endpoint } from 'one'
import { handleSyncExecutorPushRequest } from 'orez-sync-executor'
import { authServer } from '~/features/auth/server/authServer'
import { zeroExecutor } from '~/zero/server'
export const POST: Endpoint = async (request) => {
  const authData = await getAuthDataFromRequest(authServer, request)
  return handleSyncExecutorPushRequest({
    executor: zeroExecutor,
    request,
    authData,
  })
}
