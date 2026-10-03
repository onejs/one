// resolves the authed user for the sync host's forwarded push/pull requests.
//
// the sync host forwards auth two ways:
//  1. the http session cookie (web — `feed.session_token=…`, forwarded
//     because ZERO_*_FORWARD_COOKIES=true)
//  2. `Authorization: Bearer <session-token>` (native — the bundled runtime
//     strips cookies, so the bearer() plugin carries the session token instead)
//
// both resolve through a single `getSession`. the bearer token is appended as a
// session-token cookie (NEVER overwriting the forwarded cookie) so getSession
// finds it the same way. this mirrors ~/chat's getZeroAuthData exactly. do not
// overwrite the real Cookie header with the bearer value or fall back to a
// JWKS-fetch JWT path. Either breaks web pushes on the SSR loopback.
import { APP_SCHEME } from '~/constants'

type AuthServerLike = {
  api: {
    getSession: (args: { headers: Headers }) => Promise<{
      user?: { id: string; email?: string | null; role?: string | null } | null
    } | null>
  }
}

export type AuthData = {
  id: string
  email?: string
  role?: string
}

export async function getZeroAuthData(
  authServer: AuthServerLike,
  request: Request,
): Promise<AuthData | null> {
  try {
    const headers = new Headers(request.headers)
    const authHeader = headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const existing = headers.get('Cookie') || ''
      headers.set(
        'Cookie',
        existing
          ? `${existing}; ${APP_SCHEME}.session_token=${token}`
          : `${APP_SCHEME}.session_token=${token}`,
      )
    }

    const session = await authServer.api.getSession({ headers })
    if (session?.user) {
      return {
        id: session.user.id,
        email: session.user.email || undefined,
        role: session.user.role === 'admin' ? 'admin' : undefined,
      }
    }
  } catch (error) {
    console.error('[zero] getZeroAuthData error:', error)
  }

  return null
}
