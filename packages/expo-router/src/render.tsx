import stream from 'node:stream'
import ReactDOMServer from 'react-dom/server'
import type { GlobbedRouteImports } from './types'
import { loadRoutes } from './useViteRoutes'

export const renderToString = async (
  app: React.ReactElement,
  { routes }: { routes?: GlobbedRouteImports } = {}
) => {
  if (routes) {
    await loadRoutes(routes)
  }

  const collectedHead: { helmet?: Record<string, any> } = {}
  globalThis['vxrn__headContext__'] = collectedHead

  const appHtml = await renderToStringWithSuspense(app)
  // const appHtml = ReactDOMServer.renderToString(app)

  const headHtml = `${Object.values(collectedHead?.helmet ?? {})
    .map((v: any) => v.toString())
    .join('\n')}`

  return { appHtml, headHtml }
}

function renderToStringWithSuspense(element) {
  return new Promise((resolve, reject) => {
    const writable = new stream.Writable({
      write(chunk, encoding, callback) {
        result += chunk.toString()
        callback()
      },
      final(callback) {
        callback()
      },
    })

    writable.on('finish', () => {
      resolve(result)
    })

    writable.on('error', (error) => {
      console.error('[renderToStringWithSuspense] Stream error:', error)
      reject(error)
    })

    let result = ''

    const { pipe, abort } = ReactDOMServer.renderToPipeableStream(element, {
      onShellReady() {
        pipe(writable)
      },
      onAllReady() {
        writable.end()
      },
      onShellError(err) {
        console.error('[renderToStringWithSuspense] Shell error:', err)
        abort()
        writable.destroy()
        reject(err)
      },
      onError(err) {
        console.error('[renderToStringWithSuspense] Error during rendering:', err)
        writable.destroy()
        reject(err)
      },
    })
  })
}
