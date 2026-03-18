/**
 * pool of worker threads for parallel SSR rendering.
 * distributes render tasks across CPU cores, keeping the main thread
 * free for loader execution (setTimeout/IO callbacks).
 *
 * static route data (preloads, css) is registered once per route on each worker.
 * per-request messages only carry the dynamic data (loaderData, path, params).
 */
import { Worker } from 'node:worker_threads'
import { cpus } from 'node:os'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

type PendingTask = {
  resolve: (html: string) => void
  reject: (err: Error) => void
}

let workers: Worker[] | null = null
let freeWorkers: number[] = []
let taskQueue: Array<{
  renderProps: any
  routeKey: string
  resolve: (html: string) => void
  reject: (err: Error) => void
}> = []
let pendingTasks = new Map<number, PendingTask>()
let nextId = 0
let poolReady: Promise<void> | null = null

// track which route keys have been registered on workers
const registeredRoutes = new Set<string>()

function getWorkerScriptPath(): string {
  const thisDir = dirname(fileURLToPath(import.meta.url))
  return resolve(thisDir, 'ssrWorker.mjs')
}

function dispatchToWorker(
  workerIdx: number,
  renderProps: any,
  routeKey: string,
  task: PendingTask
) {
  const id = nextId++
  pendingTasks.set(id, task)
  workers![workerIdx].postMessage({
    type: 'render',
    id,
    routeKey,
    renderProps,
  })
}

function createWorker(
  scriptPath: string,
  entryPath: string,
  workerIdx: number
): Promise<void> {
  return new Promise((resolveInit, rejectInit) => {
    const worker = new Worker(scriptPath)
    workers![workerIdx] = worker

    let readyResolved = false

    worker.on('message', (msg: any) => {
      if (msg.type === 'ready' && !readyResolved) {
        readyResolved = true
        const initId = nextId++
        pendingTasks.set(initId, {
          resolve: () => resolveInit(),
          reject: (err) => rejectInit(err),
        })
        worker.postMessage({ type: 'init', id: initId, entryPath })
        return
      }

      if (msg.type === 'init-done') {
        const task = pendingTasks.get(msg.id)
        if (task) {
          pendingTasks.delete(msg.id)
          task.resolve('')
        }
        return
      }

      if (msg.type === 'done') {
        const task = pendingTasks.get(msg.id)
        if (task) {
          pendingTasks.delete(msg.id)
          const queued = taskQueue.length > 0 ? taskQueue.shift()! : null
          if (queued) {
            dispatchToWorker(workerIdx, queued.renderProps, queued.routeKey, queued)
          } else {
            freeWorkers.push(workerIdx)
          }
          task.resolve(msg.html)
        }
        return
      }

      if (msg.type === 'error') {
        const task = pendingTasks.get(msg.id)
        if (task) {
          pendingTasks.delete(msg.id)
          const queued = taskQueue.length > 0 ? taskQueue.shift()! : null
          if (queued) {
            dispatchToWorker(workerIdx, queued.renderProps, queued.routeKey, queued)
          } else {
            freeWorkers.push(workerIdx)
          }
          const err = new Error(msg.error)
          if (msg.stack) err.stack = msg.stack
          task.reject(err)
        }
        return
      }
    })

    worker.on('error', (err) => {
      console.error('[one] SSR worker error:', err)
      if (!readyResolved) {
        rejectInit(err)
      }
    })

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`[one] SSR worker exited with code ${code}`)
      }
    })
  })
}

export function initSSRWorkerPool(serverEntryPath: string): Promise<void> {
  if (poolReady) return poolReady

  const numWorkers = Math.max(1, Math.min(cpus().length - 1, 16))
  workers = new Array(numWorkers)

  const scriptPath = getWorkerScriptPath()

  poolReady = (async () => {
    await Promise.all(
      Array.from({ length: numWorkers }, (_, i) =>
        createWorker(scriptPath, serverEntryPath, i)
      )
    )
    freeWorkers = Array.from({ length: numWorkers }, (_, i) => i)
    console.info(`[one] SSR worker pool ready: ${numWorkers} workers`)
  })()

  return poolReady
}

/**
 * register static route data on all workers (preloads, css, etc.)
 * called once per unique route, before the first render for that route.
 */
export function ensureRouteRegistered(
  routeKey: string,
  staticData: {
    mode: string
    preloads?: string[]
    deferredPreloads?: string[]
    css?: string[]
    cssContents?: string[]
  }
) {
  if (registeredRoutes.has(routeKey)) return
  registeredRoutes.add(routeKey)

  if (!workers) return
  for (const worker of workers) {
    worker.postMessage({ type: 'register-route', routeKey, staticData })
  }
}

export function renderOnWorker(routeKey: string, renderProps: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const workerIdx = freeWorkers.pop()

    if (workerIdx !== undefined) {
      dispatchToWorker(workerIdx, renderProps, routeKey, { resolve, reject })
    } else {
      taskQueue.push({ renderProps, routeKey, resolve, reject })
    }
  })
}

export function isWorkerPoolAvailable(): boolean {
  return workers !== null && workers.length > 0
}

export async function shutdownSSRWorkerPool(): Promise<void> {
  if (!workers) return
  await Promise.all(workers.map((w) => w.terminate()))
  workers = null
  poolReady = null
  freeWorkers = []
  taskQueue = []
  pendingTasks.clear()
  registeredRoutes.clear()
}
