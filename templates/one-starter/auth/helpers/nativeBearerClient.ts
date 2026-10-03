import type { BetterAuthClientPlugin } from 'better-auth/client'

type MaybePromise<Value> = Value | Promise<Value>

export interface NativeBearerTokenStore {
  get(): MaybePromise<string | undefined>
  set(token: string, expectedToken: string | undefined): MaybePromise<boolean>
  remove(expectedToken: string | undefined): MaybePromise<boolean>
}

export interface NativeBearerClientOptions {
  origin?: string
  tokenStore: NativeBearerTokenStore
}

// the plain single-value stores apps build with (a StorageValue, localStorage,
// MMKV) have no compare-and-swap, so the guard lives here rather than in each
// consumer. when this interface gained its expectedToken arguments every app
// that passed a bare value store stopped typechecking, and each one would
// otherwise have reimplemented the same four lines.
export interface SingleValueStore {
  get(): string | undefined
  set(value: string): void
  remove(): void
}

// a write only lands while storage still holds the token the caller expected,
// so a response that raced a newer sign-in cannot install a token for the
// previous account.
export function nativeBearerTokenStore(value: SingleValueStore): NativeBearerTokenStore {
  return {
    get: () => value.get(),
    set: (token, expectedToken) => {
      if (value.get() !== expectedToken) return false
      value.set(token)
      return true
    },
    remove: (expectedToken) => {
      if (value.get() !== expectedToken) return false
      value.remove()
      return true
    },
  }
}

function requestBearerToken(request: { headers: Headers }): string | undefined {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return undefined
  return authorization.slice('Bearer '.length)
}

export function nativeBearerClient(options: NativeBearerClientOptions) {
  return {
    id: 'app-native-bearer',
    fetchPlugins: [
      {
        id: 'app-native-bearer',
        name: 'Native bearer',
        hooks: {
          async onRequest(context: {
            headers: Headers
            credentials?: RequestCredentials
          }) {
            context.credentials = 'omit'

            if (options.origin) {
              if (!context.headers.has('mobile-origin')) {
                context.headers.set('mobile-origin', options.origin)
              }
            }

            const token = await options.tokenStore.get()
            if (token && !context.headers.has('authorization')) {
              context.headers.set('authorization', `Bearer ${token}`)
            }
          },
          async onSuccess(context: {
            request: { url: URL | string; headers: Headers }
            response: Response
          }) {
            const requestToken = requestBearerToken(context.request)
            const requestPath = new URL(
              context.request.url.toString(),
              'https://better-auth.invalid',
            ).pathname
            if (requestPath.endsWith('/sign-out')) {
              await options.tokenStore.remove(requestToken)
              return
            }

            const token = context.response.headers.get('set-auth-token')
            if (token) await options.tokenStore.set(token, requestToken)
          },
          async onError(context: {
            request: { headers: Headers }
            error: { status: number }
          }) {
            if (context.error.status === 401) {
              await options.tokenStore.remove(requestBearerToken(context.request))
            }
          },
        },
      },
    ],
  } satisfies BetterAuthClientPlugin
}
