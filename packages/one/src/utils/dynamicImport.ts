// adds vite-ignore to avoid warning logs in vite:

export const dynamicImport = (path: string) => {
  if (process.env.TAMAGUI_TARGET === 'native') {
    // import causes an "invalid expression" bug in react native
    // TODO make this work, probably needs to fetch + eval?
    console.info(`dynamicImport TODO`, path)
    // return require(path)
    return Promise.resolve(undefined)
  }

  if (process.env.TAMAGUI_TARGET !== 'native') {
    return import(
      /* @vite-ignore */
      path
    ).catch((err) => {
      if (process.env.ONE_SKEW_PROTECTION !== 'false' && isChunkLoadError(err)) {
        handleSkewError()
      }
      throw err
    })
  }
}

const CHUNK_ERROR_PATTERNS = [
  'Failed to fetch dynamically imported module', // chrome
  'error loading dynamically imported module', // firefox
  'Importing a module script failed', // safari
]

function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return CHUNK_ERROR_PATTERNS.some((p) => msg.includes(p))
}

function handleSkewError() {
  if (typeof window === 'undefined') return
  const key = '__one_skew_reload'
  const last = sessionStorage.getItem(key)
  if (!last || Date.now() - Number(last) > 10_000) {
    sessionStorage.setItem(key, String(Date.now()))
    window.location.reload()
  }
}
