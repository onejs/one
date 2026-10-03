import { createAuthClient } from 'better-auth/react'
import { useEffect } from 'react'
import { isAuthSessionLocallyCleared, refreshAuthSession } from './sessionStore'
import type {
  BetterAuthClientOptions,
  InferSessionFromClient,
  InferUserFromClient,
} from 'better-auth/client'

export type AppAuthState = 'loading' | 'logged-in' | 'logged-out'

export type BetterAuthReactClient<Options extends BetterAuthClientOptions> = ReturnType<
  typeof createAuthClient<Options>
>

export interface AppAuth<Options extends BetterAuthClientOptions> {
  state: AppAuthState
  isLoggedIn: boolean
  user: InferUserFromClient<Options> | null
  session: InferSessionFromClient<Options> | null
}

export interface AppBetterAuthClient<Options extends BetterAuthClientOptions> {
  authClient: BetterAuthReactClient<Options>
  useAuth(): AppAuth<Options>
}

export function createAppBetterAuthClient<
  const Options extends BetterAuthClientOptions,
>(options: Options): AppBetterAuthClient<Options> {
  const authClient = createAuthClient(options)

  // a session check that never got an answer is not a sign-out. Better Auth
  // keeps the previous session when /get-session fails with anything but a
  // 401, but the first check after a mount has nothing to keep, so a request
  // that times out settles as data null + isPending false — byte for byte the
  // shape of signed out. app route guards redirect to the login route on that,
  // so one slow auth request threw away the route and forced a fresh sign-in.
  // report `loading` and ask again instead: the state stays honest, and the app
  // signs back in by itself the moment auth answers. one timer serves every
  // caller of useAuth.
  let retryAttempt = 0
  let retryTimer: ReturnType<typeof setTimeout> | null = null

  function useAuth(): AppAuth<Options> {
    const result = authClient.useSession()
    const locallyLoggedOut = isAuthSessionLocallyCleared(authClient)
    const unanswered =
      !locallyLoggedOut &&
      !result.isPending &&
      result.data == null &&
      result.error != null &&
      // Better Auth clears the session for a 401 and only a 401, so that one is
      // a real sign-out. reading the same field keeps the two in step.
      Reflect.get(result.error, 'status') !== 401
    // each retry passes through an in-flight state that is not `unanswered`;
    // only an answer resets the backoff, or it never grows past its first step.
    const answered = !unanswered && !result.isPending && !result.isRefetching

    useEffect(() => {
      if (!unanswered) {
        if (answered) retryAttempt = 0
        return
      }
      if (retryTimer) return
      const delayMs = Math.min(5_000, 300 * 3 ** retryAttempt)
      retryAttempt += 1
      retryTimer = setTimeout(() => {
        retryTimer = null
        refreshAuthSession(authClient)
      }, delayMs)
    }, [unanswered, answered])

    const pending = !locallyLoggedOut && (result.isPending || unanswered)
    const data = pending || locallyLoggedOut ? null : sessionPayload<Options>(result.data)

    return {
      state: pending ? 'loading' : data ? 'logged-in' : 'logged-out',
      isLoggedIn: data !== null,
      user: data?.user ?? null,
      session: data?.session ?? null,
    }
  }

  return { authClient, useAuth }
}

function sessionPayload<Options extends BetterAuthClientOptions>(data: unknown) {
  // Better Auth exposes the same response through separate hook and inference
  // types, so keep their relationship at this one compile-only boundary.
  return data as {
    session: InferSessionFromClient<Options>
    user: InferUserFromClient<Options>
  } | null
}
