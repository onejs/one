import type {
  ClientState,
  DesiredQuery,
  Engine,
  Format,
  JSONValue,
  MaterializedView,
  Mutation,
  MutationPromise,
  MutationResultDetails,
  NativeMutate,
  Mutator,
  Mutators,
  PullResponse,
  Query,
  QueryError,
  QueryResultType,
  Schema,
  TableMutations,
  Transaction,
  Transport,
  TTL,
  WriteKind,
} from './types'
import { NativeView, queryTTL } from './view'
import { NativeSync, type SyncOptions } from './sync'

export type NativeZeroOptions<M extends Mutators = Mutators> = {
  engine: Engine
  schema: Schema
  mutators: M
  transport?: Transport
  onError?: (error: unknown) => void
  context?: unknown
}

type Subscription = {
  query: Query
  listener: (value: unknown, resultType: QueryResultType, error?: QueryError) => void
  hash?: string
  onError?: (error: QueryError) => void
  previous?: string
  published?: boolean
  active: boolean
}

function serialize(request: object): string {
  return JSON.stringify(request, (_key, value) => {
    if (typeof value === 'number' && !Number.isFinite(value))
      throw new TypeError('Native Zero values must contain finite numbers')
    return value
  })
}

function queryResult(value: JSONValue, format?: Format): unknown {
  if (format?.singular && value === null) return undefined
  if (Array.isArray(value))
    return value.map((row) => queryResult(row, { relationships: format?.relationships }))
  if (value && typeof value === 'object' && format?.relationships) {
    return Object.fromEntries(
      Object.entries(value).map(([name, nested]) => [
        name,
        format.relationships?.[name]
          ? queryResult(nested, format.relationships[name])
          : nested,
      ])
    )
  }
  return value
}

export class NativeZero<M extends Mutators = Mutators> {
  private tail: Promise<unknown> = Promise.resolve()
  private syncTail: Promise<unknown> = Promise.resolve()
  private closed = false
  private closing?: Promise<void>
  private deleting?: Promise<void>
  private abort = new AbortController()
  private subscriptions = new Set<Subscription>()
  private mutators = new Map<string, Mutator>()
  private views = new Set<NativeView<unknown>>()
  private identity?: string
  private desiredViews = new Map<
    string,
    {
      desired: DesiredQuery
      count: number
      ttl: number
      timer?: ReturnType<typeof setTimeout>
    }
  >()
  private manualQueries?: readonly DesiredQuery[]
  private managesQueries = false
  private queryRefreshQueued = false
  private sync?: NativeSync
  private serverResults = new Map<number, (result: MutationResultDetails) => void>()
  readonly mutate: NativeMutate<M>

  constructor(private options: NativeZeroOptions<M>) {
    const register = (mutators: Mutators, prefix: string): object => {
      const functions = Object.create(null)
      for (const [name, value] of Object.entries(mutators)) {
        const key = prefix + name
        if (typeof value === 'function') {
          if (this.mutators.has(key))
            throw new Error(`Duplicate native Zero mutator: ${key}`)
          this.mutators.set(key, value)
          functions[name] = (args?: JSONValue) => this.issueMutation(key, args)
        } else functions[name] = register(value, key + '.')
      }
      return functions
    }
    const functions = register(options.mutators, '')
    const mutate = (name: string, args?: JSONValue) => this.issueMutation(name, args)
    for (const [name, value] of Object.entries(functions))
      Object.defineProperty(mutate, name, { value, enumerable: true })
    this.mutate = mutate as NativeMutate<M>
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    if (this.closed) return Promise.reject(new Error('Native Zero client is closed'))
    const result = this.tail.then(operation)
    this.tail = result.catch(() => {})
    return result
  }

  private synchronize(operation: () => Promise<void>): Promise<void> {
    if (this.closed) return Promise.reject(new Error('Native Zero client is closed'))
    const result = this.syncTail.then(operation)
    this.syncTail = result.catch(() => {})
    return result
  }

  private async request<T>(request: object): Promise<T> {
    return this.dispatch(serialize(request))
  }

  private async dispatch<T>(request: string): Promise<T> {
    return JSON.parse(await this.options.engine.execute(request)) as T
  }

  private async query<T>(query: Query, transaction?: string): Promise<T> {
    return queryResult(
      await this.request<JSONValue>({
        op: 'query',
        ast: query.ast,
        format: query.format,
        transaction,
      }),
      query.format
    ) as T
  }

  run<T = unknown>(query: Query): Promise<T> {
    return this.enqueue(() => this.query<T>(query))
  }

  get clientID(): string {
    if (!this.identity)
      throw new Error('Await NativeZero.ready() before reading clientID')
    return this.identity
  }

  get context(): unknown {
    return this.options.context
  }

  async ready(): Promise<this> {
    await this.state()
    return this
  }

  state(): Promise<ClientState> {
    return this.enqueue(async () => {
      const state = await this.request<ClientState>({ op: 'state' })
      this.identity = state.clientID
      return state
    })
  }

  pending(): Promise<Mutation[]> {
    return this.enqueue(() => this.request({ op: 'pending' }))
  }

  startSync(options: SyncOptions = {}): NativeSync {
    if (this.closed) throw new Error('Native Zero client is closed')
    if (!this.options.transport)
      throw new Error('Native Zero transport is not configured')
    this.sync?.stop()
    this.sync = new NativeSync(this, options, (error) => this.report(error))
    return this.sync
  }

  private async withSignal<T>(
    signal: AbortSignal | undefined,
    operation: (signal: AbortSignal) => Promise<T>
  ): Promise<T> {
    if (!signal) return operation(this.abort.signal)
    if (signal.aborted || this.abort.signal.aborted)
      throw new Error('Native Zero sync stopped')
    const controller = new AbortController()
    let rejectAbort!: (error: Error) => void
    const cancelled = new Promise<never>((_resolve, reject) => {
      rejectAbort = reject
    })
    const abort = () => {
      controller.abort()
      rejectAbort(new Error('Native Zero sync stopped'))
    }
    signal.addEventListener('abort', abort)
    this.abort.signal.addEventListener('abort', abort)
    try {
      return await Promise.race([operation(controller.signal), cancelled])
    } finally {
      signal.removeEventListener('abort', abort)
      this.abort.signal.removeEventListener('abort', abort)
    }
  }

  private async invoke(
    mutation: Mutation,
    transaction: string,
    reason: Transaction['reason']
  ) {
    const mutator = this.mutators.get(mutation.name)
    if (!mutator) throw new Error(`Unknown native Zero mutator: ${mutation.name}`)
    let active = true
    let operations: Promise<unknown> = Promise.resolve()
    const failures: { observed: boolean; failed: boolean; error?: unknown }[] = []
    const schedule = <T>(operation: () => Promise<T>): Promise<T> => {
      if (!active) return Promise.reject(new Error('Native Zero transaction is closed'))
      const result = operations.then(operation)
      const status = { observed: false, failed: false, error: undefined as unknown }
      failures.push(status)
      operations = result.catch((error) => {
        status.failed = true
        status.error = error
      })
      return {
        [Symbol.toStringTag]: 'Promise',
        then(onfulfilled, onrejected) {
          status.observed = true
          return result.then(onfulfilled, onrejected)
        },
        catch(onrejected) {
          status.observed = true
          return result.catch(onrejected)
        },
        finally(onfinally) {
          status.observed = true
          return result.finally(onfinally)
        },
      }
    }
    const tx: Transaction = {
      clientID: mutation.clientID,
      mutationID: mutation.id,
      location: 'client',
      reason,
      run: <T>(query: Query) => schedule(() => this.query<T>(query, transaction)),
      mutate: Object.fromEntries(
        Object.keys(this.options.schema.tables).map((table) => [
          table,
          Object.fromEntries(
            (['insert', 'upsert', 'update', 'delete'] as WriteKind[]).map((kind) => [
              kind,
              (value: object) =>
                schedule(async () => {
                  await this.request({ op: 'write', kind, table, value, transaction })
                }),
            ])
          ) as TableMutations,
        ])
      ),
    }
    try {
      const result = await mutator(tx, mutation.args)
      active = false
      await operations
      const unobserved = failures.find((status) => status.failed && !status.observed)
      if (unobserved) throw unobserved.error
      return result
    } finally {
      active = false
      await operations
    }
  }

  private issueMutation(name: string, args?: JSONValue): MutationPromise {
    let settle!: (result: MutationResultDetails) => void
    const server = new Promise<MutationResultDetails>((resolve) => {
      settle = resolve
    })
    const operation = this.executeMutation(name, args, (mutation) => {
      if (this.closed)
        settle({
          type: 'error',
          error: { type: 'zero', message: 'Native Zero client is closed' },
        })
      else this.serverResults.set(mutation.id, settle)
    })
    const client = operation.then<MutationResultDetails, MutationResultDetails>(
      () => ({ type: 'success' }),
      (error) => {
        const result: MutationResultDetails = {
          type: 'error',
          error: {
            type: 'app',
            message: error instanceof Error ? error.message : String(error),
          },
        }
        settle(result)
        return result
      }
    )
    return Object.assign(operation, { client, server })
  }

  private async executeMutation(
    name: string,
    args: JSONValue = null,
    committed: (mutation: Mutation) => void
  ): Promise<unknown> {
    const request = serialize({ op: 'beginMutation', name, args, timestamp: Date.now() })
    return this.enqueue(async () => {
      if (!this.mutators.has(name))
        throw new Error(`Unknown native Zero mutator: ${name}`)
      const { transaction, mutation } = await this.dispatch<{
        transaction: string
        mutation: Mutation
      }>(request)
      let result: unknown
      try {
        result = await this.invoke(mutation, transaction, 'optimistic')
        await this.request({ op: 'commitMutation', transaction })
      } catch (error) {
        await this.request({ op: 'rollback', transaction })
        throw error
      }
      committed(mutation)
      await this.publish()
      this.sync?.request()
      return result
    })
  }

  private async applyPull(response: PullResponse, state: ClientState) {
    const { transaction, pending, changed } = await this.request<{
      transaction: string
      pending: Mutation[]
      changed: boolean
    }>({
      op: 'beginPull',
      response,
      baseCookie: state.cookie,
      queryVersion: state.queryVersion,
    })
    try {
      for (const mutation of pending) await this.invoke(mutation, transaction, 'rebase')
      await this.request({ op: 'commitPull', transaction })
    } catch (error) {
      await this.request({ op: 'rollback', transaction })
      throw error
    }
    const acknowledged = response.lastMutationIDChanges?.[state.clientID]
    if (acknowledged !== undefined) {
      for (const [id, settle] of this.serverResults) {
        if (id <= acknowledged) {
          settle({ type: 'success' })
          this.serverResults.delete(id)
        }
      }
    }
    if (changed) await this.publish()
  }

  pull(queries?: readonly DesiredQuery[], signal?: AbortSignal): Promise<void> {
    const captured: readonly DesiredQuery[] | undefined =
      queries === undefined ? undefined : JSON.parse(serialize({ queries })).queries
    return this.synchronize(async () => {
      const transport = this.options.transport
      if (!transport) throw new Error('Native Zero transport is not configured')
      if (captured !== undefined) {
        if (new Set(captured.map((query) => query.hash)).size !== captured.length)
          throw new Error('desired queries require distinct nonempty hashes')
        this.manualQueries = captured
        this.managesQueries = true
      }
      const state = await this.enqueue(() => {
        const desired = this.managesQueries
          ? new Map((this.manualQueries ?? []).map((query) => [query.hash, query]))
          : undefined
        for (const [hash, view] of this.desiredViews) {
          const manual = desired!.get(hash)
          if (manual && serialize(manual) !== serialize(view.desired))
            throw new Error('Native Zero query hash refers to different queries')
          desired!.set(hash, view.desired)
        }
        return this.request<ClientState>({
          op: 'setQueries',
          queries: desired ? [...desired.values()] : undefined,
        })
      })
      const response = await this.withSignal(signal, (linked) =>
        transport.pull(state, state.queries, linked)
      )
      await this.enqueue(() => {
        if (signal?.aborted) throw new Error('Native Zero sync stopped')
        return this.applyPull(response, state)
      })
    })
  }

  push(signal?: AbortSignal): Promise<void> {
    return this.synchronize(async () => {
      const transport = this.options.transport
      if (!transport) throw new Error('Native Zero transport is not configured')
      const { state, pending } = await this.enqueue(async () => ({
        state: await this.request<ClientState>({ op: 'state' }),
        pending: await this.request<Mutation[]>({ op: 'pending' }),
      }))
      if (state.recoveryRequired !== null)
        throw new Error('CLIENT_STATE_NOT_FOUND: pending writes require reconciliation')
      if (pending.length) {
        const outcomes = await this.withSignal(signal, (linked) =>
          transport.push(state, pending, linked)
        )
        if (outcomes) {
          for (const outcome of outcomes) {
            this.serverResults.get(outcome.id)?.(outcome.result)
            this.serverResults.delete(outcome.id)
          }
          const failed = outcomes.find((outcome) => outcome.result.type === 'error')
          if (failed?.result.type === 'error')
            throw new Error(`Orez mutation failed: ${failed.result.error.message}`)
        }
      }
    })
  }

  subscribe(query: Query, listener: (value: unknown) => void): () => void {
    if (this.closed) throw new Error('Native Zero client is closed')
    const subscription: Subscription = { query, listener, active: true }
    this.subscriptions.add(subscription)
    void this.enqueue(() => this.publish([subscription])).catch((error) =>
      this.report(error)
    )
    return () => {
      subscription.active = false
      this.subscriptions.delete(subscription)
    }
  }

  materialize<T = unknown>(
    query: Query,
    options: { hash?: string; ttl?: TTL } = {}
  ): MaterializedView<T> {
    if (this.closed) throw new Error('Native Zero client is closed')
    const hash = options.hash ?? query.hash?.()
    if (!hash) throw new Error('Native Zero materialization requires a query hash')
    let ttl = queryTTL(options.ttl)
    const captured = JSON.parse(
      serialize({ ast: query.ast, format: query.format })
    ) as Query
    const desired: DesiredQuery = { hash, ast: captured.ast }
    const existing = this.desiredViews.get(hash)
    if (existing && serialize(existing.desired) !== serialize(desired))
      throw new Error('Native Zero query hash refers to different queries')
    this.managesQueries = true
    if (existing?.timer !== undefined) clearTimeout(existing.timer)
    this.desiredViews.set(hash, {
      desired,
      count: (existing?.count ?? 0) + 1,
      ttl: existing && existing.count > 0 ? existing.ttl : 0,
    })
    const subscription: Subscription = {
      query: captured,
      hash,
      active: true,
      listener: (data, resultType, error) => view.update(data as T, resultType, error),
      onError: (error) => view.update(view.data, 'error', error),
    }
    const view = new NativeView<T>(
      (captured.format?.singular ? undefined : []) as T,
      () => {
        subscription.active = false
        this.subscriptions.delete(subscription)
        this.views.delete(view as NativeView<unknown>)
        const registered = this.desiredViews.get(hash)!
        registered.ttl = Math.max(registered.ttl, ttl)
        if (--registered.count === 0) {
          if (!this.closed && registered.ttl > 0) {
            registered.timer = setTimeout(() => {
              this.desiredViews.delete(hash)
              this.refreshQueries()
            }, registered.ttl)
          } else {
            this.desiredViews.delete(hash)
            this.refreshQueries()
          }
        }
      },
      (error) => this.report(error),
      (value) => {
        ttl = queryTTL(value)
      }
    )
    this.views.add(view as NativeView<unknown>)
    this.subscriptions.add(subscription)
    void this.enqueue(() => this.publish([subscription])).catch((error) =>
      this.report(error)
    )
    if (!existing) this.refreshQueries()
    return view
  }

  private refreshQueries() {
    if (this.sync) {
      this.sync.request()
      return
    }
    if (this.closed || !this.options.transport || this.queryRefreshQueued) return
    this.queryRefreshQueued = true
    queueMicrotask(() => {
      this.queryRefreshQueued = false
      if (!this.closed) void this.pull().catch((error) => this.report(error))
    })
  }

  private report(error: unknown) {
    queueMicrotask(() => {
      if (this.options.onError) this.options.onError(error)
      else globalThis.console.error(error)
    })
  }

  private async publish(subscriptions: Iterable<Subscription> = this.subscriptions) {
    const entries = [...subscriptions]
    const state = entries.some((subscription) => subscription.hash)
      ? await this.request<ClientState>({ op: 'state' })
      : undefined
    const complete = new Set(state?.completedQueries)
    const errors = new Map(Object.entries(state?.queryErrors ?? {}))
    for (const subscription of entries) {
      if (!subscription.active || this.closed) continue
      try {
        const value = await this.query(subscription.query)
        const message = subscription.hash ? errors.get(subscription.hash) : undefined
        const error: QueryError | undefined =
          message === undefined ? undefined : { error: 'app', message }
        const resultType: QueryResultType = error
          ? 'error'
          : subscription.hash && complete.has(subscription.hash)
            ? 'complete'
            : 'unknown'
        const serialized = JSON.stringify([value, resultType, error])
        if (
          !subscription.active ||
          this.closed ||
          (subscription.published && serialized === subscription.previous)
        )
          continue
        subscription.previous = serialized
        subscription.published = true
        subscription.listener(value, resultType, error)
      } catch (error) {
        if (subscription.onError)
          subscription.onError({
            error: 'app',
            message: error instanceof Error ? error.message : String(error),
          })
        else this.report(error)
      }
    }
  }

  close(): Promise<void> {
    return this.shutdown(false)
  }

  delete(): Promise<void> {
    if (this.deleting) return this.deleting
    if (this.closed)
      return Promise.reject(new Error('Native Zero client is already closed'))
    return this.shutdown(true)
  }

  private shutdown(remove: boolean): Promise<void> {
    if (this.closing) return this.closing
    this.closed = true
    for (const settle of this.serverResults.values())
      settle({
        type: 'error',
        error: { type: 'zero', message: 'Native Zero client is closed' },
      })
    this.serverResults.clear()
    this.sync?.stop()
    this.abort.abort()
    for (const view of [...this.views]) view.destroy()
    for (const registration of this.desiredViews.values()) {
      if (registration.timer !== undefined) clearTimeout(registration.timer)
    }
    this.desiredViews.clear()
    this.subscriptions.clear()
    const operation = this.tail.then(async () => {
      if (remove) await this.request({ op: 'delete' })
    })
    const close = () => this.options.engine.close()
    this.closing = operation.then(close, close)
    if (!remove) return this.closing
    this.deleting = operation.then(
      async () => {
        await this.closing
      },
      async (error) => {
        await this.closing
        throw error
      }
    )
    return this.deleting
  }
}
