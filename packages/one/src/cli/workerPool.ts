/**
 * Worker pool for parallel page building using true multicore.
 */
import { Worker } from 'node:worker_threads'
import { cpus } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface PendingTask {
  id: number
  resolve: (result: any) => void
  reject: (error: Error) => void
}

export class BuildWorkerPool {
  private workers: Worker[] = []
  private available: Worker[] = []
  private taskQueue: Array<{ msg: any; pending: PendingTask }> = []
  private pendingById = new Map<number, PendingTask>()
  private nextId = 0
  private readyCount = 0
  private initCount = 0
  private _ready: Promise<void>
  private _resolveReady!: () => void
  private _initialized: Promise<void>
  private _resolveInitialized!: () => void
  private _terminated = false

  constructor(size = Math.max(1, cpus().length - 1)) {
    this._ready = new Promise((resolve) => {
      this._resolveReady = resolve
    })
    this._initialized = new Promise((resolve) => {
      this._resolveInitialized = resolve
    })

    // use .mjs for proper ESM module resolution in worker threads
    const workerPath = join(__dirname, 'buildPageWorker.mjs')

    for (let i = 0; i < size; i++) {
      const worker = new Worker(workerPath)

      worker.on('message', (msg: any) => {
        if (msg.type === 'ready') {
          this.readyCount++
          this.available.push(worker)
          if (this.readyCount === size) {
            this._resolveReady()
          }
        } else if (msg.type === 'init-done') {
          this.initCount++
          if (this.initCount === size) {
            this._resolveInitialized()
          }
          this.dispatch()
        } else if (msg.type === 'done' || msg.type === 'error') {
          const pending = this.pendingById.get(msg.id)
          if (pending) {
            this.pendingById.delete(msg.id)
            if (msg.type === 'done') {
              pending.resolve(msg.result)
            } else {
              pending.reject(new Error(msg.error))
            }
          }
          this.available.push(worker)
          this.dispatch()
        }
      })

      worker.on('error', (err) => {
        console.error('[BuildWorkerPool] Worker error:', err)
      })

      this.workers.push(worker)
    }
  }

  get size() {
    return this.workers.length
  }

  // initialize all workers - they load config themselves from vite.config
  async initialize() {
    await this._ready
    // send init message to all workers
    // workers load the vite config themselves to avoid serialization issues
    for (const worker of this.workers) {
      worker.postMessage({ type: 'init', id: this.nextId++ })
    }
    // wait for all workers to be initialized
    await this._initialized
  }

  private dispatch() {
    while (this.available.length > 0 && this.taskQueue.length > 0) {
      const worker = this.available.shift()!
      const { msg, pending } = this.taskQueue.shift()!
      this.pendingById.set(pending.id, pending)
      worker.postMessage(msg)
    }
  }

  async buildPage(args: {
    serverEntry: string
    path: string
    relativeId: string
    params: any
    foundRoute: any
    clientManifestEntry: any
    staticDir: string
    clientDir: string
    builtMiddlewares: Record<string, string>
    serverJsPath: string
    preloads: string[]
    allCSS: string[]
    routePreloads: Record<string, string>
    allCSSContents?: string[]
    criticalPreloads?: string[]
    deferredPreloads?: string[]
    useAfterLCP?: boolean
    useAfterLCPAggressive?: boolean
  }): Promise<any> {
    if (this._terminated) {
      throw new Error('Worker pool has been terminated')
    }

    // serialize foundRoute to only include plain data (no functions)
    // workers can't receive non-serializable data like functions
    const serializedRoute = {
      type: args.foundRoute.type,
      file: args.foundRoute.file,
      // only keep serializable layout data
      layouts: args.foundRoute.layouts?.map((layout: any) => ({
        contextKey: layout.contextKey,
        loaderServerPath: layout.loaderServerPath,
        layoutRenderMode: layout.layoutRenderMode,
      })),
      // only keep contextKey from middlewares
      middlewares: args.foundRoute.middlewares?.map((mw: any) => ({
        contextKey: mw.contextKey,
      })),
    }

    const id = this.nextId++
    const msg = {
      type: 'build',
      id,
      args: {
        ...args,
        foundRoute: serializedRoute,
      },
    }

    return new Promise((resolve, reject) => {
      const pending: PendingTask = { id, resolve, reject }
      this.taskQueue.push({ msg, pending })
      this.dispatch()
    })
  }

  async terminate() {
    this._terminated = true
    await Promise.all(this.workers.map((w) => w.terminate()))
    this.workers = []
    this.available = []
  }
}

// singleton pool instance
let pool: BuildWorkerPool | null = null

export function getWorkerPool(size?: number): BuildWorkerPool {
  if (!pool) {
    pool = new BuildWorkerPool(size)
  }
  return pool
}

export async function terminateWorkerPool() {
  if (pool) {
    await pool.terminate()
    pool = null
  }
}
