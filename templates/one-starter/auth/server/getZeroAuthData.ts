// better-auth resolves web cookies and native bearer tokens through one session lookup.
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
