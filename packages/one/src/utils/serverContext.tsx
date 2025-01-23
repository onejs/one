import { createContext, useContext } from 'react'
import { SERVER_CONTEXT_KEY } from '../constants'
import type { One } from '../vite/types'
import { ensureAsyncLocalID } from './one__ensureAsyncLocalID'

export type ServerContext = {
  css?: string[]
  postRenderData?: any
  loaderData?: any
  loaderProps?: any
  mode?: 'spa' | 'ssg' | 'ssr'
}

export type MaybeServerContext = null | ServerContext

export const SERVER_CONTEXT_POST_RENDER_STRING = `_one_post_render_data_`

const serverContexts = new WeakMap<any, ServerContext>()

export function setServerContext(data: ServerContext) {
  if (process.env.VITE_ENVIRONMENT === 'ssr') {
    const id = ensureAsyncLocalID()
    if (!serverContexts.has(id)) {
      serverContexts.set(id, {})
    }

    const context = serverContexts.get(id)!
    Object.assign(context, data)
  } else {
    throw new Error(`Don't call setServerContext on client`)
  }
}

export function getServerContext() {
  if (process.env.VITE_ENVIRONMENT === 'ssr') {
    try {
      return serverContexts.get(useContext(ServerAsyncLocalIDContext))
    } catch {
      // ok, not in react tree
    }
  }

  const out = (() => {
    if (process.env.VITE_ENVIRONMENT === 'ssr') {
      const id = ensureAsyncLocalID()
      return serverContexts.get(id)
    }
    return globalThis[SERVER_CONTEXT_KEY] as MaybeServerContext
  })()

  return out
}

// we bridge it to react because reacts weird rendering loses it
const ServerAsyncLocalIDContext = createContext<ServerContext | null>(null)
export const ProviderServerAsyncLocalIDContext = ServerAsyncLocalIDContext.Provider

export function ServerContextScript() {
  if (process.env.VITE_ENVIRONMENT === 'client' || process.env.VITE_ENVIRONMENT === 'ssr') {
    const context = getServerContext()

    return (
      <script
        async
        // @ts-ignore
        href={SERVER_CONTEXT_KEY}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html:
            process.env.VITE_ENVIRONMENT === 'client'
              ? ``
              : `
              globalThis["${SERVER_CONTEXT_KEY}"] = ${JSON.stringify({
                ...context,
                postRenderData: SERVER_CONTEXT_POST_RENDER_STRING,
              })};
          `,
        }}
      />
    )
  }

  return null
}

/**
 * For passing data from the server to the client. Can only be called on the server.
 * You can type it by overriding `One.ClientData` type using declare module 'one'.
 *
 * On the client, you can access the data with `getServerData`.
 */
export function setServerData<Key extends keyof One.ClientData>(
  key: Key,
  value: One.ClientData[Key]
) {
  if (process.env.VITE_ENVIRONMENT === 'ssr') {
    const context = getServerContext()
    setServerContext({
      postRenderData: {
        ...context?.postRenderData,
        [key]: value,
      },
    })
  } else {
    throw new Error(`Cannot setServerData in ${process.env.VITE_ENVIRONMENT} environment!`)
  }
}

/**
 * For getting data set by setServerData on the server.
 */
export function getServerData(key: keyof One.ClientData) {
  if (process.env.VITE_ENVIRONMENT === 'ssr') {
    throw new Error(`Cannot getServerData on the server`)
  }
  if (process.env.VITE_ENVIRONMENT !== 'ssr') {
    return getServerContext()?.postRenderData?.[key]
  }
}
