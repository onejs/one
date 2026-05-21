import { SERVER_CONTEXT_KEY } from '../constants'
import { safeJsonStringify } from '../utils/htmlEscape'
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

    // strip cssContents - read from DOM instead (CSSPrehydrateScript)
    const { cssContents, ...restContext } = context || {}

    // strip page loaderData from matches to avoid double-serialization.
    // we always strip the leaf (its data lives in restContext.loaderData and
    // gets restored client-side onto matches[last]). reference equality on
    // restContext.loaderData was too aggressive — if a layout's loaderData
    // happened to ref-equal the page's (e.g. both `null`), the layout would
    // permanently lose its data after hydration.
    const lastMatchIndex = (restContext.matches?.length ?? 0) - 1
    const compactMatches = restContext.matches?.map((m: any, i: number) => ({
      routeId: m.routeId,
      pathname: m.pathname,
      params: m.params,
      ...(i === lastMatchIndex ? {} : { loaderData: m.loaderData }),
    }))

    const clientContext = {
      ...restContext,
      matches: compactMatches,
      cssInlineCount: cssContents?.length || 0,
      // use placeholder — postRenderData is set during render (after this component)
      // and replaced in the HTML string after rendering completes
      postRenderData: SERVER_CONTEXT_POST_RENDER_STRING,
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
