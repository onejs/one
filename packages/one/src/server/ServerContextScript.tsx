import { SERVER_CONTEXT_KEY } from "../constants";
import { SERVER_CONTEXT_POST_RENDER_STRING } from "../vite/constants";
import { useServerContext } from "../vite/one-server-only";

export function ServerContextScript() {
  if (process.env.VITE_ENVIRONMENT === "client") {
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
    );
  }

  if (process.env.VITE_ENVIRONMENT === "ssr") {
    const context = useServerContext();
    const cssUrls = context?.css || [];

    // Strip cssContents from JSON payload - we'll read it from DOM instead.
    // This avoids duplicating 100KB+ of CSS as JSON in the HTML.
    // The CSSPrehydrateScript reads the actual <style> elements' innerHTML
    // and stores them in globalThis.__oneCSSContents for hydration matching.
    const { cssContents, ...restContext } = context || {};
    const clientContext = {
      ...restContext,
      cssInlineCount: cssContents?.length || 0,
    };

    return (
      <script
        async
        // @ts-expect-error
        href={SERVER_CONTEXT_KEY}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `
              globalThis["${SERVER_CONTEXT_KEY}"] = ${JSON.stringify({
                ...clientContext,
                postRenderData: SERVER_CONTEXT_POST_RENDER_STRING,
              })};
              globalThis.__oneLoadedCSS = new Set(${JSON.stringify(cssUrls)});
          `,
        }}
      />
    );
  }

  return null;
}
