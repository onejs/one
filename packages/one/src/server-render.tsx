import ReactDOMServer from 'react-dom/server.browser'

export type RenderToStringOptions = {
  /**
   * Critical scripts that need to execute immediately (will use async).
   * These are added to bootstrapModules and generate both modulepreload links and async script tags.
   */
  preloads?: string[]
}

/**
 * Buffered SSR - renders to full HTML string.
 * Deferred preloads and server data are rendered in the React tree
 * (React 19 hoists <link> to <head>).
 */
export const renderToString = async (
  app: React.ReactElement,
  options: RenderToStringOptions
) => {
  const readableStream = await ReactDOMServer.renderToReadableStream(app, {
    bootstrapModules: options.preloads,
  })
  await readableStream.allReady

  const reader = readableStream.getReader()
  const decoder = new TextDecoder('utf-8')
  let out = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    out += decoder.decode(value, { stream: true })
  }
  out += decoder.decode()

  return out
}

/**
 * Streaming SSR - returns ReadableStream directly.
 * Skips allReady wait for faster TTFB.
 */
export const renderToStream = async (
  app: React.ReactElement,
  options: RenderToStringOptions
): Promise<ReadableStream> => {
  return ReactDOMServer.renderToReadableStream(app, {
    bootstrapModules: options.preloads,
  })
}
