import ReactDOMServer from 'react-dom/server.browser'

export type RenderToStringOptions = {
  /**
   * Critical scripts that need to execute immediately (will use async).
   * These are added to bootstrapModules and generate both modulepreload links and async script tags.
   * Keep this list minimal (typically: setupClient, one-entry, page entry).
   */
  preloads?: string[]

  /**
   * Non-critical scripts that can wait (will only be modulepreload hints).
   * These only generate <link rel="modulepreload"> tags and are loaded when imported.
   * Use this for component libraries, utilities, and other non-essential modules.
   */
  deferredPreloads?: string[]
}

export const renderToString = async (
  app: React.ReactElement,
  options: RenderToStringOptions
) => {
  const readableStream = await ReactDOMServer.renderToReadableStream(app, {
    bootstrapModules: options.preloads,
  })
  // wait for suspense boundaries - should be near-instant since loaders are pre-resolved
  await readableStream.allReady

  // read all chunks efficiently
  const reader = readableStream.getReader()
  const decoder = new TextDecoder('utf-8')
  let out = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    out += decoder.decode(value, { stream: true })
  }
  out += decoder.decode()

  // add non-critical modulepreload links to head
  if (options.deferredPreloads?.length) {
    const modulepreloadLinks = options.deferredPreloads
      .map((src) => `<link rel="modulepreload" fetchPriority="low" href="${src}"/>`)
      .join('')
    out = out.replace('</head>', `${modulepreloadLinks}</head>`)
  }

  return out
}

/**
 * streaming SSR - returns a ReadableStream instead of a string.
 * skips allReady wait and post-processing. deferred preloads should
 * be in the React tree (React 19 hoists <link> to <head>).
 */
export const renderToStream = async (
  app: React.ReactElement,
  options: RenderToStringOptions
): Promise<ReadableStream> => {
  const stream = await ReactDOMServer.renderToReadableStream(app, {
    bootstrapModules: options.preloads,
  })
  return stream
}
