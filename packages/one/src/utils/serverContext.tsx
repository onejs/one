import { SERVER_CONTEXT_KEY } from '../constants'
import type { One } from '../vite/types'

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

const isClient = typeof document !== 'undefined'

let serverContext: MaybeServerContext = globalThis[SERVER_CONTEXT_KEY] || null

export function setServerContext(c: ServerContext) {
  if (isClient) {
    serverContext ||= {
      postRenderData: SERVER_CONTEXT_POST_RENDER_STRING,
    }
    Object.assign(serverContext, c)
  } else {
    globalThis[SERVER_CONTEXT_KEY] = c
  }
}

export function getServerContext() {
  if (isClient) {
    return serverContext
  }
  return globalThis[SERVER_CONTEXT_KEY] as MaybeServerContext
}

export function ServerContextScript() {
  const context = getServerContext()
  if (!context) {
    throw new Error(`no server context, internal one bug`)
  }
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
 * On the client, you can access the data with `getClientData`.
 */
export function setClientData<Key extends keyof One.ClientData>(
  key: Key,
  value: One.ClientData[Key]
) {
  if (process.env.VITE_ENVIRONMENT === 'server') {
    setServerContext({
      clientData: {
        ...serverContext?.clientData,
        [key]: value,
      },
    })
  } else {
    throw new Error(`Cannot setClientData in ${process.env.VITE_ENVIRONMENT} environment!`)
  }
}

/**
 * For getting data set by setClientData on the server.
 */
export function getClientData(key: keyof One.ClientData) {
  if (process.env.VITE_ENVIRONMENT === 'server') {
    throw new Error(`Cannot getClientData on the server`)
  }
  return getServerContext()?.clientData?.[key]
}
