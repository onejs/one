import { handleSyncExecutorPushRequest } from 'orez-lite'
import { authServer } from '~/auth/server/authServer'
import { getZeroAuthData } from '~/auth/server/getZeroAuthData'
import { zeroExecutor } from '~/data/zero-server'
import type { Endpoint } from 'one'

export const POST: Endpoint = async (request) => {
  try {
    const authData = await getZeroAuthData(authServer, request)

    // no anon fallback: an unauthenticated push must be rejected, never written
    // under a placeholder identity. silently coercing to `{ id: 'anon' }`
    // committed every web mutation as `anon` (cookie was being clobbered server
    // side) while the query socket validated as the real user — the
    // "userID does not match validated server userID" / "auth state not
    // available" protocol errors, plus orphaned anon-owned rows.
    if (!authData) {
      return new Response('unauthorized', { status: 401 })
    }

    return handleSyncExecutorPushRequest({
      executor: zeroExecutor,
      request,
      authData,
    })
  } catch (err) {
    console.error('[zero:push] error', err)
    return new Response('internal error', { status: 500 })
  }
}
