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

export const renderToString = async (app: React.ReactElement, options: RenderToStringOptions) => {
  const readableStream = await ReactDOMServer.renderToReadableStream(app, {
    // Only pass critical scripts to bootstrapModules
    // These generate both modulepreload links AND async script tags
    bootstrapModules: options.preloads,
  })
  await readableStream.allReady
  let out = await streamToString(readableStream)

  // Add non-critical modulepreload links to head (just hints, no script execution)
  if (options.deferredPreloads?.length) {
    const modulepreloadLinks = options.deferredPreloads
      .map((src) => `<link rel="modulepreload" fetchPriority="low" href="${src}"/>`)
      .join('')
    out = out.replace('</head>', `${modulepreloadLinks}</head>`)
  }

  return out
}

async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let result = ''

  // @ts-expect-error TS is wrong, see https://nodejs.org/api/webstreams.html#async-iteration
  for await (const chunk of stream) {
    result += decoder.decode(chunk, { stream: true })
  }

  result += decoder.decode()
  return result
}
