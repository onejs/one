import { AsyncLocalStorage } from 'node:async_hooks'
import { _registerWatchFileImpl } from './watchFile'

export type LoaderResult<T> = {
  result: T
  dependencies: Set<string>
}

const LOADER_DEPS_KEY = '__oneLoaderDepsContext'

type LoaderDepsStore = {
  deps: Set<string>
}

const LOADER_DEPS_STORE = {
  get current(): AsyncLocalStorage<LoaderDepsStore> {
    if (globalThis[LOADER_DEPS_KEY]) return globalThis[LOADER_DEPS_KEY]
    const als = new AsyncLocalStorage<LoaderDepsStore>()
    globalThis[LOADER_DEPS_KEY] = als
    return als
  },
}

const debugLoaderDeps = process.env.ONE_DEBUG_LOADER_DEPS

function watchFileImpl(path: string): void {
  const store = LOADER_DEPS_STORE.current.getStore()
  if (store) {
    store.deps.add(path)
  }
}

_registerWatchFileImpl(watchFileImpl)

export async function trackLoaderDependencies<T>(
  fn: () => T | Promise<T>
): Promise<LoaderResult<Awaited<T>>> {
  const deps = new Set<string>()
  const context = LOADER_DEPS_STORE.current

  const result = await context.run({ deps }, async () => {
    return await fn()
  })

  if (debugLoaderDeps && deps.size > 0) {
    console.info('[loader-deps] tracked dependencies:', [...deps])
  }

  return {
    result,
    dependencies: deps,
  }
}
