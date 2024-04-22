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

  // just rendering to string for step 1 / dev mode but need suspense support
  // const appHtml = await renderToStringWithSuspense(app)
  const appHtml = ReactDOMServer.renderToString(app)

  const headHtml = `${Object.values(collectedHead?.helmet ?? {})
    .map((v: any) => v.toString())
    .join('\n')}`

  return { appHtml, headHtml }
}

// function renderToStringWithSuspense(element) {
//   return new Promise((resolve, reject) => {
//     const writable = new stream.Writable({
//       write(chunk, encoding, callback) {
//         result += chunk.toString()
//         console.log('writing', result)
//         callback()
//       },
//     })

//     writable.on('finish', () => {
//       resolve(result)
//     })

//     let result = ''

//     const { pipe, abort } = ReactDOMServer.renderToPipeableStream(element, {
//       onShellReady() {},
//       onAllReady() {
//         writable.end()
//       },
//       onShellError(err) {
//         abort()
//         writable.destroy()
//         reject(err)
//       },
//       onError(error) {
//         writable.destroy()
//         reject(error)
//       },
//     })

//     pipe(writable)
//   })
// }

// function renderToStringWithSuspense(element) {
//   return new Promise((resolve, reject) => {
//     let result = ''

//     const { pipe, abort } = ReactDOMServer.renderToPipeableStream(element, {
//       onAllReady() {
//         // Resolve the promise with the full HTML when everything is ready
//         resolve(result)
//       },
//       onShellError(err) {
//         // Reject the promise on shell rendering errors
//         reject(err)
//       },
//       onError(error) {
//         // Abort the stream and reject the promise on any streaming error
//         abort()
//         reject(error)
//       },
//     })

//     console.log('go?')

//     // Collect chunks into result
//     pipe({
//       write(chunk) {
//         result += chunk.toString()
//         console.log('write', chunk.toString())
//       },
//       end() {
//         // This might also be where you resolve the promise if onAllReady doesn't fit the use case
//       },
//       on(event, handler) {
//         if (event === 'error') {
//           handler(new Error('Stream error'))
//         }
//       },
//       removeListener() {}, // Necessary if the stream implementation requires it
//       once() {},
//       emit() {},
//       writable: true,
//       // Implement other necessary stream methods
//     })
//   })
// }
