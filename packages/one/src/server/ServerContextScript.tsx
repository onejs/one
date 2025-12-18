import { SERVER_CONTEXT_KEY } from '../constants'
import { SERVER_CONTEXT_POST_RENDER_STRING } from '../vite/constants'
import { useServerContext } from '../vite/one-server-only'

export function ServerContextScript() {
  if (process.env.VITE_ENVIRONMENT === 'client') {
    return (
      <script
        async
        // @ts-expect-error
        href={SERVER_CONTEXT_KEY}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: ``,
        }}
      />
    )
  }

  if (process.env.VITE_ENVIRONMENT === 'ssr') {
    const context = useServerContext()
    const cssUrls = context?.css || []

    return (
      <script
        async
        // @ts-expect-error
        href={SERVER_CONTEXT_KEY}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `
              globalThis["${SERVER_CONTEXT_KEY}"] = ${JSON.stringify({
                ...context,
                postRenderData: SERVER_CONTEXT_POST_RENDER_STRING,
              })};
              globalThis.__oneLoadedCSS = new Set(${JSON.stringify(cssUrls)});
          `,
        }}
      />
    )
  }

  return null
}
