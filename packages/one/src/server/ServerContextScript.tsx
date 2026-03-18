import { SERVER_CONTEXT_KEY } from '../constants'
import { safeJsonStringify } from '../utils/htmlEscape'
import { getServerContext, useServerContext } from '../vite/one-server-only'

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

    // strip cssContents - read from DOM instead (CSSPrehydrateScript)
    const { cssContents, ...restContext } = context || {}

    // strip page loaderData from matches to avoid double-serialization
    const compactMatches = restContext.matches?.map((m: any) => ({
      routeId: m.routeId,
      pathname: m.pathname,
      params: m.params,
      ...(m.loaderData !== restContext.loaderData ? { loaderData: m.loaderData } : {}),
    }))

    // serialize postRenderData directly (loaders run before render, so data is ready)
    const postRenderData = getServerContext()?.postRenderData

    const clientContext = {
      ...restContext,
      matches: compactMatches,
      cssInlineCount: cssContents?.length || 0,
      postRenderData: postRenderData || undefined,
    }

    return (
      <script
        async
        // @ts-expect-error
        href={SERVER_CONTEXT_KEY}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `
              globalThis["${SERVER_CONTEXT_KEY}"] = ${safeJsonStringify(clientContext)};
              globalThis.__oneLoadedCSS = new Set(${safeJsonStringify(cssUrls)});
          `,
        }}
      />
    )
  }

  return null
}
