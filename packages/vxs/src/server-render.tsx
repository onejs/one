import ReactDOMServer from 'react-dom/server.browser'

export const renderToString = async (app: React.ReactElement) => {
  const readableStream = await ReactDOMServer.renderToReadableStream(app, {
    bootstrapModules: ['/@vite/client', './src/entry.tsx', '/@vxs/entry'],
  })
  await readableStream.allReady
  const out = await streamToString(readableStream)
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
