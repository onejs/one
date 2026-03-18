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

    // Strip cssContents from JSON payload - we'll read it from DOM instead.
    // This avoids duplicating 100KB+ of CSS as JSON in the HTML.
    // The CSSPrehydrateScript reads the actual <style> elements' innerHTML
    // and stores them in globalThis.__oneCSSContents for hydration matching.
    const { cssContents, ...restContext } = context || {}

    // Strip loaderData from matches to avoid double-serialization.
    // The page's loaderData is already at context.loaderData, and layout
    // loaderData is typically small. Only the page match duplicates data.
    const compactMatches = restContext.matches?.map((m: any) => ({
      routeId: m.routeId,
      pathname: m.pathname,
      params: m.params,
      // only include layout loaderData (not page - it's in context.loaderData)
      ...(m.loaderData !== restContext.loaderData ? { loaderData: m.loaderData } : {}),
    }))

    const clientContext = {
      ...restContext,
      matches: compactMatches,
      cssInlineCount: cssContents?.length || 0,
    }

    return (
      <script
        async
        // @ts-expect-error
        href={SERVER_CONTEXT_KEY}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `
              globalThis["${SERVER_CONTEXT_KEY}"] = ${safeJsonStringify({
                ...clientContext,
                postRenderData: SERVER_CONTEXT_POST_RENDER_STRING,
              })};
              globalThis.__oneLoadedCSS = new Set(${safeJsonStringify(cssUrls)});
          `,
        }}
      />
    )
  }

  return null
}
