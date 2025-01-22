import { SERVER_CONTEXT_KEY } from '../constants'
import type { One } from '../vite/types'
import { ensureAsyncLocalID } from './ensureAsyncLocalID'

export type ServerContext = {
  css?: string[]
  postRenderData?: any
  loaderData?: any
  loaderProps?: any
  // externally exposed for apps to use
  clientData?: any
  mode?: 'spa' | 'ssg' | 'ssr'
}

export type MaybeServerContext = null | ServerContext

export const SERVER_CONTEXT_POST_RENDER_STRING = `_one_post_render_data_`

const serverContexts = new WeakMap<any, ServerContext>()

export function setServerContext(data: ServerContext) {
  if (process.env.VITE_ENVIRONMENT === 'ssr') {
    const id = ensureAsyncLocalID()
    if (!serverContexts.has(id)) {
      serverContexts.set(id, {
        postRenderData: SERVER_CONTEXT_POST_RENDER_STRING,
      })
    }

    const context = serverContexts.get(id)!
    Object.assign(context, data)
  } else {
    throw new Error(`Don't call setServerContext on client`)
  }
}

export function getServerContext() {
  const out = (() => {
    if (process.env.VITE_ENVIRONMENT === 'ssr') {
      const id = ensureAsyncLocalID()
      return serverContexts.get(id)
    }
    return globalThis[SERVER_CONTEXT_KEY] as MaybeServerContext
  })()
  if (!out) {
    throw new Error(`no server context, internal one bug`)
  }
  return out
}

export function ServerContextScript() {
  const context = getServerContext()

  return (
    <script
      async
      // @ts-ignore
      href={SERVER_CONTEXT_KEY}
      dangerouslySetInnerHTML={{
        __html: `
            globalThis["${SERVER_CONTEXT_KEY}"] = ${JSON.stringify(context)};
        `,
      }}
    />
  )
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
  if (process.env.VITE_ENVIRONMENT === 'server') {
    const context = getServerContext()
    setServerContext({
      clientData: {
        ...context?.clientData,
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
  if (process.env.VITE_ENVIRONMENT === 'server') {
    throw new Error(`Cannot getServerData on the server`)
  }
  return getServerContext()?.clientData?.[key]
}
