// adds vite-ignore to avoid warning logs in vite:

export const dynamicImport = (path: string) => {
  if (process.env.TAMAGUI_TARGET === 'native') {
    // import causes an "invalid expression" bug in react native
    // TODO make this work, probably needs to fetch + eval?
    console.info(`dynamicImport TODO`, path)
    // return require(path)
    return Promise.resolve(undefined)
  }

  // retry a transient chunk-fetch failure in place before giving up, then fall
  // back to one's debounced reload. the in-place retry matters because a single
  // rejection permanently poisons callers that memoize the loader result — most
  // notably React.lazy, which caches the FIRST settled value (rejection
  // included) and re-throws it forever without re-invoking the loader. the retry
  // is always cheap; only the reload honors the ONE_SKEW_PROTECTION opt-out.
  return loadWithRetry(
    () =>
      import(
        /* @vite-ignore */
        path
      ),
    {
      onChunkErrorExhausted: () =>
        process.env.ONE_SKEW_PROTECTION !== 'false' ? handleSkewError() : false,
    }
  )
}

const CHUNK_ERROR_PATTERNS = [
  'Failed to fetch dynamically imported module', // chrome
  'error loading dynamically imported module', // firefox
  'Importing a module script failed', // safari
]

export function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return CHUNK_ERROR_PATTERNS.some((p) => msg.includes(p))
}

// debounced one-time reload to recover from a deploy skew or a poisoned dev
// module graph. returns whether it actually scheduled a reload (false when
// debounced away within the cooldown, or on the server) so callers like
// loadWithRetry can decide whether to keep waiting for the teardown or surface
// the underlying error.
export function handleSkewError(): boolean {
  if (typeof window === 'undefined') return false
  const key = '__one_skew_reload'
  const last = sessionStorage.getItem(key)
  if (!last || Date.now() - Number(last) > 10_000) {
    sessionStorage.setItem(key, String(Date.now()))
    window.location.reload()
    return true
  }
  return false
}

// extra attempts after the first before giving up. a transient chunk fetch
// (ECONNRESET / dev-server 5xx / timeout under load) usually recovers on the
// next try when the failure is the top-level chunk.
export const CHUNK_RETRY_ATTEMPTS = 3
// linear backoff between chunk retries: ride out a brief hiccup, not a long
// outage.
export const CHUNK_RETRY_DELAY_MS = 500

const realDelay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// wraps a dynamic-import loader so a transient rejection is retried with backoff
// before it settles, instead of permanently poisoning a caller that memoizes the
// result (e.g. React.lazy — see dynamicImport above, and lazyWithRetry). when
// retries are exhausted on a chunk-load error, recover via the injected reload
// (defaults to one's debounced handleSkewError); the reload tears the page down,
// so the returned promise is left pending rather than rejecting into a surviving
// tree. `delay` + `onChunkErrorExhausted` are injectable so this is unit-testable
// without real timers or a real location.reload.
export async function loadWithRetry<T>(
  loader: () => Promise<T>,
  options: {
    attempts?: number
    delayMs?: number
    delay?: (ms: number) => Promise<void>
    onChunkErrorExhausted?: () => boolean
  } = {}
): Promise<T> {
  const attempts = options.attempts ?? CHUNK_RETRY_ATTEMPTS
  const delayMs = options.delayMs ?? CHUNK_RETRY_DELAY_MS
  const delay = options.delay ?? realDelay
  const recover = options.onChunkErrorExhausted ?? handleSkewError

  const attempt = async (retriesLeft: number): Promise<T> => {
    try {
      return await loader()
    } catch (err) {
      if (retriesLeft > 0) {
        await delay(delayMs)
        return attempt(retriesLeft - 1)
      }
      // out of retries: a chunk-load failure is a dev module-graph poison or a
      // prod deploy skew — recover via the debounced reload. the reload tears the
      // page down, so leave this promise pending (resolving/rejecting would
      // flash a broken tree). if the reload was debounced away, surface the real
      // error so it isn't swallowed.
      if (isChunkLoadError(err) && recover()) {
        return new Promise<T>(() => {})
      }
      throw err
    }
  }
  return attempt(attempts)
}
