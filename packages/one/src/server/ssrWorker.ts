/**
 * worker thread for parallel SSR rendering.
 * each worker imports the server entry and renders independently,
 * freeing the main thread's event loop for loader execution.
 *
 * static route data (preloads, css) is cached per route key to avoid
 * re-sending it with every render request.
 */
import { parentPort } from 'node:worker_threads'
import { AsyncLocalStorage } from 'node:async_hooks'

if (!parentPort) {
  console.error('ssrWorker must be run as a worker thread')
  process.exit(1)
}

// set up server environment before any imports
process.env.VXRN_REACT_19 = '1'
process.env.VITE_ENVIRONMENT = 'ssr'
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production'
}

// worker's own ALS for render context isolation
const als = new AsyncLocalStorage()
globalThis['__vxrnrequestAsyncLocalStore'] = als

// cached static route data (preloads, css, etc.) - registered once per route
const routeStaticData = new Map<
  string,
  {
    mode: string
    preloads?: string[]
    deferredPreloads?: string[]
    css?: string[]
    cssContents?: string[]
  }
>()

let render: ((props: any) => Promise<string>) | null = null
let initPromise: Promise<void> | null = null

async function ensureInit(entryPath: string) {
  if (render) return
  if (initPromise) return initPromise
  initPromise = (async () => {
    const entry = await import(entryPath)
    render = entry.default.render
  })()
  return initPromise
}

parentPort.on('message', async (msg: any) => {
  if (msg.type === 'init') {
    try {
      await ensureInit(msg.entryPath)
      parentPort!.postMessage({ type: 'init-done', id: msg.id })
    } catch (err) {
      parentPort!.postMessage({
        type: 'error',
        id: msg.id,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      })
    }
    return
  }

  if (msg.type === 'register-route') {
    routeStaticData.set(msg.routeKey, msg.staticData)
    return
  }

  if (msg.type === 'render') {
    try {
      globalThis['__vxrnresetState']?.()

      // merge cached static data with dynamic render props
      let renderProps = msg.renderProps
      const cached = routeStaticData.get(msg.routeKey)
      if (cached) {
        renderProps = { ...cached, ...renderProps }
      }

      // wrap in ALS context so setServerContext works inside render()
      const id = { _id: Math.random() }
      let html: string = ''
      await als.run(id, async () => {
        html = await render!(renderProps)
      })

      parentPort!.postMessage({ type: 'done', id: msg.id, html })
    } catch (err) {
      parentPort!.postMessage({
        type: 'error',
        id: msg.id,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      })
    }
    return
  }
})

parentPort.postMessage({ type: 'ready' })
