export type JSONValue =
  | null
  | boolean
  | number
  | string
  | readonly JSONValue[]
  | { readonly [key: string]: JSONValue }
export type Row = Record<string, JSONValue>
export type Format = {
  singular?: boolean
  relationships?: Record<string, Format>
}
export type Query = {
  ast: unknown
  format?: Format
}
export type Mutation = {
  id: number
  clientID: string
  name: string
  args: JSONValue
  timestamp: number
}
export type ClientState = {
  clientID: string
  clientGroupID: string
  cookie: JSONValue
  nextMutationID: number
  lastMutationID: number
  queryVersion: number
  queries: readonly DesiredQuery[]
}
export type PullResponse = {
  cookie: JSONValue
  lastMutationIDChanges?: Record<string, number>
  rowsPatch?: readonly JSONValue[]
  unchanged?: boolean
  [key: string]: JSONValue | undefined
}
export interface Engine {
  execute(request: string): Promise<string>
  close(): Promise<void>
}
export type Schema = {
  tables: Record<
    string,
    { name: string; primaryKey: readonly string[]; columns: Record<string, unknown> }
  >
  relationships?: Record<string, unknown>
}
export type WriteKind = 'insert' | 'upsert' | 'update' | 'delete'
export type TableMutations = Record<WriteKind, (value: Row) => Promise<void>>
export type Transaction = {
  clientID: string
  mutationID: number
  location: 'client'
  reason: 'optimistic' | 'rebase'
  run<T = unknown>(query: Query): Promise<T>
  mutate: Record<string, TableMutations>
}
export type Mutator = (tx: Transaction, args: JSONValue) => Promise<unknown> | unknown
export type Mutators = { [name: string]: Mutator | Mutators }
export type DesiredQuery =
  | { hash: string; ast: unknown }
  | { hash: string; name: string; args: readonly JSONValue[] }
export interface Transport {
  pull(
    state: ClientState,
    queries: readonly DesiredQuery[],
    signal: AbortSignal
  ): Promise<PullResponse>
  push(
    state: ClientState,
    mutations: readonly Mutation[],
    signal: AbortSignal
  ): Promise<void>
}
