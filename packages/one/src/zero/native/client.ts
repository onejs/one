import type {
  ClientState,
  DesiredQuery,
  Engine,
  JSONValue,
  Mutation,
  Mutator,
  Mutators,
  PullResponse,
  Query,
  Schema,
  TableMutations,
  Transaction,
  Transport,
  WriteKind,
} from './types'

export type NativeZeroOptions = {
  engine: Engine
  schema: Schema
  mutators: Mutators
  transport?: Transport
  onError?: (error: unknown) => void
}

type Subscription = {
  query: Query
  listener: (value: unknown) => void
  previous?: string
  active: boolean
}

export class NativeZero {
  private tail: Promise<unknown> = Promise.resolve()
  private closed = false
  private closing?: Promise<void>
  private abort = new AbortController()
  private subscriptions = new Set<Subscription>()
  private mutators = new Map<string, Mutator>()

  constructor(private options: NativeZeroOptions) {
    const register = (mutators: Mutators, prefix: string) => {
      for (const [name, value] of Object.entries(mutators)) {
        const key = prefix + name
        if (typeof value === 'function') {
          if (this.mutators.has(key))
            throw new Error(`Duplicate native Zero mutator: ${key}`)
          this.mutators.set(key, value)
        } else register(value, key + '.')
      }
    }
    register(options.mutators, '')
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    if (this.closed) return Promise.reject(new Error('Native Zero client is closed'))
    const result = this.tail.then(operation)
    this.tail = result.catch(() => {})
    return result
  }

  private async request<T>(request: object): Promise<T> {
    return JSON.parse(await this.options.engine.execute(JSON.stringify(request))) as T
  }

  run<T = unknown>(query: Query): Promise<T> {
    return this.enqueue(() =>
      this.request({ op: 'query', ast: query.ast, format: query.format })
    )
  }

  state(): Promise<ClientState> {
    return this.enqueue(() => this.request({ op: 'state' }))
  }

  pending(): Promise<Mutation[]> {
    return this.enqueue(() => this.request({ op: 'pending' }))
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
    let failure: unknown
    let failed = false
    const schedule = <T>(operation: () => Promise<T>): Promise<T> => {
      if (!active) return Promise.reject(new Error('Native Zero transaction is closed'))
      const result = operations.then(operation)
      operations = result.catch((error) => {
        failed = true
        failure = error
      })
      return result
    }
    const tx: Transaction = {
      clientID: mutation.clientID,
      mutationID: mutation.id,
      location: 'client',
      reason,
      run: <T>(query: Query) =>
        schedule(() =>
          this.request<T>({
            op: 'query',
            ast: query.ast,
            format: query.format,
            transaction,
          })
        ),
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
      if (failed) throw failure
      return result
    } finally {
      active = false
      await operations
    }
  }

  mutate(name: string, args: JSONValue = null): Promise<unknown> {
    return this.enqueue(async () => {
      if (!this.mutators.has(name))
        throw new Error(`Unknown native Zero mutator: ${name}`)
      const { transaction, mutation } = await this.request<{
        transaction: string
        mutation: Mutation
      }>({ op: 'beginMutation', name, args, timestamp: Date.now() })
      let result: unknown
      try {
        result = await this.invoke(mutation, transaction, 'optimistic')
        await this.request({ op: 'commitMutation', transaction })
      } catch (error) {
        await this.request({ op: 'rollback', transaction })
        throw error
      }
      await this.publish()
      return result
    })
  }

  private async applyPull(response: PullResponse) {
    const { transaction, pending } = await this.request<{
      transaction: string
      pending: Mutation[]
    }>({ op: 'beginPull', response })
    try {
      for (const mutation of pending) await this.invoke(mutation, transaction, 'rebase')
      await this.request({ op: 'commitPull', transaction })
    } catch (error) {
      await this.request({ op: 'rollback', transaction })
      throw error
    }
    await this.publish()
  }

  pull(queries: readonly DesiredQuery[] = []): Promise<void> {
    return this.enqueue(async () => {
      const transport = this.options.transport
      if (!transport) throw new Error('Native Zero transport is not configured')
      const state = await this.request<ClientState>({ op: 'state' })
      const response = await transport.pull(state, queries, this.abort.signal)
      await this.applyPull(response)
    })
  }

  push(): Promise<void> {
    return this.enqueue(async () => {
      const transport = this.options.transport
      if (!transport) throw new Error('Native Zero transport is not configured')
      const state = await this.request<ClientState>({ op: 'state' })
      const pending = await this.request<Mutation[]>({ op: 'pending' })
      if (pending.length) await transport.push(state, pending, this.abort.signal)
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

  private report(error: unknown) {
    queueMicrotask(() => {
      if (this.options.onError) this.options.onError(error)
      else globalThis.console.error(error)
    })
  }

  private async publish(subscriptions: Iterable<Subscription> = this.subscriptions) {
    for (const subscription of subscriptions) {
      if (!subscription.active || this.closed) continue
      try {
        const value = await this.request({
          op: 'query',
          ast: subscription.query.ast,
          format: subscription.query.format,
        })
        const serialized = JSON.stringify(value)
        if (!subscription.active || this.closed || serialized === subscription.previous)
          continue
        subscription.previous = serialized
        subscription.listener(value)
      } catch (error) {
        this.report(error)
      }
    }
  }

  close(): Promise<void> {
    if (this.closing) return this.closing
    this.closed = true
    this.abort.abort()
    this.subscriptions.clear()
    this.closing = this.tail.then(() => this.options.engine.close())
    return this.closing
  }
}
