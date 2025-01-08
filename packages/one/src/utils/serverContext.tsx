type ServerContext = {
  css?: string[]
  postRenderData?: any
  loaderData?: any
  loaderProps?: any
  mode?: 'spa' | 'ssg' | 'ssr'
}

type MaybeServerContext = null | ServerContext

export const SERVER_CONTEXT_POST_RENDER_STRING = `_one_post_render_data_`
const SERVER_CONTEXT_KEY = '__one_server_context__'
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
            globalThis[${SERVER_CONTEXT_KEY}] = ${JSON.stringify(context)};
        `,
      }}
    />
  )
}
