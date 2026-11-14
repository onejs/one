import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { DriverEngine } from './engine'
import { fileURLToPath } from 'node:url'
import { NativeZero } from '../../src/zero/native/client'
import { createOrezTransport } from '../../src/zero/native/orez'
import { createServer } from 'node:http'
import type {
  JSONValue,
  PullResponse,
  Query,
  Row,
  Schema,
} from '../../src/zero/native/types'

const here = dirname(fileURLToPath(import.meta.url))
const scratch =
  process.env.ONE_ZERO_TEST_DIR ?? join(homedir(), '.scratch', 'one-zero-native')
const build = join(scratch, 'build')
const sqlite = process.env.ONE_ZERO_SQLITE_ROOT
function command(args: string[]) {
  const result = spawnSync(args[0], args.slice(1), { encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr + result.stdout)
}
if (!process.env.ONE_ZERO_DRIVER) {
  command([
    'cmake',
    '-S',
    here,
    '-B',
    build,
    '-DCMAKE_BUILD_TYPE=Debug',
    ...(sqlite ? [`-DOP_SQLITE_ROOT=${sqlite}`] : []),
  ])
  command(['cmake', '--build', build, '-j', '4'])
}
const driver = process.env.ONE_ZERO_DRIVER ?? join(build, 'one-zero-driver')
command(['mkdir', '-p', scratch])
const folder = mkdtempSync(join(scratch, 'integration-'))
const schema: Schema = {
  tables: {
    message: {
      name: 'message',
      primaryKey: ['id'],
      columns: {
        id: { type: 'string' },
        session: { type: 'string' },
        seq: { type: 'number' },
        body: { type: 'string' },
        status: { type: 'string' },
        extra: { type: 'json', optional: true },
      },
    },
    session: {
      name: 'session',
      primaryKey: ['id'],
      columns: {
        id: { type: 'string' },
        title: { type: 'string' },
        state: { type: 'string' },
      },
    },
  },
}
const schemaFile = join(folder, 'schema.json')
writeFileSync(schemaFile, JSON.stringify(schema))

class ProcessEngine extends DriverEngine {
  constructor(path: string) {
    super(driver, path, schemaFile, 'integration-client')
  }
}

const messages: Query = { ast: { table: 'message', orderBy: [['seq', 'asc']] } }
const message = (
  id: string,
  seq: number,
  body: string,
  extra: JSONValue = null
): Row => ({ id, seq, body, session: 's1', status: 'sent', extra })
const put = (tableName: string, value: Row) => ({ op: 'put', tableName, value })
let response: PullResponse = {
  cookie: 1,
  rowsPatch: [
    put('session', { id: 's1', title: 'native experiment', state: 'idle' }),
    put('message', message('server', 1, 'original')),
  ],
}
let pushed: unknown[] = []
const transport = {
  async pull() {
    return response
  },
  async push(_state: unknown, mutations: unknown[]) {
    pushed.push(...mutations)
  },
}
let rejectReplay = false
const mutators = {
  async send(
    tx: Parameters<NonNullable<import('../../src/zero/native/types').Mutator>>[0],
    args: JSONValue
  ) {
    if (!args || typeof args !== 'object' || Array.isArray(args))
      throw new Error('expected send arguments')
    const latest = await tx.run<Row>({
      ast: { table: 'message', orderBy: [['seq', 'desc']], limit: 1 },
      format: { singular: true },
    })
    await tx.mutate.message.upsert({
      ...message(String(args.id), Number(latest?.seq ?? 0) + 1, String(args.text)),
      status: 'sending',
    })
    if (rejectReplay && tx.reason === 'rebase')
      throw new Error('replay deliberately failed')
  },
  async failure(tx: Parameters<import('../../src/zero/native/types').Mutator>[0]) {
    await tx.mutate.message.upsert(message('failed', 99, 'must roll back'))
    throw new Error('mutator deliberately failed')
  },
}
let engine = new ProcessEngine(join(folder, 'client.sqlite'))
await engine.ready
let client = new NativeZero({ engine, schema, mutators, transport })
await client.pull()
assert.deepEqual(await client.run(messages), [message('server', 1, 'original')])
const publications: unknown[] = []
const unsubscribe = client.subscribe(messages, (rows) => publications.push(rows))
await client.state()
await client.mutate('send', { id: 'local', text: 'hello from native' })
assert.deepEqual(await client.run(messages), [
  message('server', 1, 'original'),
  { ...message('local', 2, 'hello from native'), status: 'sending' },
])
assert.equal((await client.pending()).length, 1)
await client.push()
assert.equal(pushed.length, 1)
response = {
  cookie: 2,
  rowsPatch: [put('message', message('remote', 2, 'arrived before ack'))],
}
await client.pull()
assert.deepEqual(
  (await client.run<Row[]>(messages)).map((row) => [row.id, row.seq]),
  [
    ['server', 1],
    ['remote', 2],
    ['local', 3],
  ]
)
assert.equal(publications.length, 3)
await assert.rejects(client.mutate('failure'), /deliberately failed/)
assert.equal((await client.pending()).length, 1)
assert.equal((await client.run<Row[]>(messages)).length, 3)
rejectReplay = true
response = {
  cookie: 3,
  rowsPatch: [put('message', message('rollback', 20, 'must not publish'))],
}
await assert.rejects(client.pull(), /replay deliberately failed/)
assert.equal((await client.state()).cookie, 2)
assert.equal((await client.run<Row[]>(messages)).length, 3)
assert.equal(publications.length, 3)
rejectReplay = false
unsubscribe()
await client.close()
engine = new ProcessEngine(join(folder, 'client.sqlite'))
await engine.ready
client = new NativeZero({ engine, schema, mutators, transport })
assert.equal((await client.pending())[0].id, 1)
assert.equal((await client.state()).cookie, 2)
assert.equal((await client.run<Row[]>(messages)).length, 3)
response = {
  cookie: 4,
  lastMutationIDChanges: { 'integration-client': 1 },
  rowsPatch: [put('message', message('local', 3, 'hello from native'))],
}
await client.pull()
assert.deepEqual(await client.pending(), [])
assert.equal((await client.run<Row[]>(messages))[2].status, 'sent')
await client.close()

engine = new ProcessEngine(join(folder, 'client.sqlite'))
await engine.ready
const transaction = await engine.raw({
  op: 'beginMutation',
  name: 'send',
  args: {},
  timestamp: 1,
})
await engine.raw({
  op: 'write',
  kind: 'upsert',
  table: 'message',
  value: message('crashed', 100, 'uncommitted'),
  transaction: transaction.transaction,
})
await assert.rejects(
  engine.raw({ op: 'query', ast: messages.ast }),
  /transaction does not belong/
)
await engine.crash()
engine = new ProcessEngine(join(folder, 'client.sqlite'))
await engine.ready
assert.deepEqual(await engine.raw({ op: 'pending' }), [])
assert.equal((await engine.raw({ op: 'query', ast: messages.ast })).length, 3)
assert.equal((await engine.raw({ op: 'state' })).cookie, 4)
await engine.close()
console.log(
  'native persistence, optimistic replay, acknowledgement, rollback, subscriptions and process-crash recovery passed'
)

const replayedIDs: number[] = []
const sequentialMutators = {
  async send(
    tx: Parameters<import('../../src/zero/native/types').Mutator>[0],
    args: JSONValue
  ) {
    if (tx.reason === 'rebase') replayedIDs.push(tx.mutationID)
    return mutators.send(tx, args)
  },
}
response = {
  cookie: 'sequence-base',
  rowsPatch: [put('message', message('server', 1, 'base'))],
}
engine = new ProcessEngine(join(folder, 'sequence.sqlite'))
await engine.ready
client = new NativeZero({ engine, schema, mutators: sequentialMutators, transport })
await client.pull()
const firstArguments = { id: 'first', text: 'first write' }
const firstMutation = client.mutate('send', firstArguments)
firstArguments.text = 'caller changed the arguments'
await firstMutation
await client.mutate('send', { id: 'second', text: 'second write' })
const journal = await client.pending()
assert.deepEqual(journal[0].args, { id: 'first', text: 'first write' })
await client.close()
engine = new ProcessEngine(join(folder, 'sequence.sqlite'))
await engine.ready
client = new NativeZero({ engine, schema, mutators: sequentialMutators, transport })
response = {
  cookie: 'sequence-rebased',
  lastMutationIDChanges: { 'integration-client': 1 },
  rowsPatch: [
    put('message', message('first', 2, 'first write')),
    put('message', message('remote', 10, 'remote write')),
  ],
}
await client.pull()
assert.deepEqual(replayedIDs, [2])
assert.deepEqual(await client.pending(), [journal[1]])
assert.equal(
  (await client.run<Row[]>(messages)).find((row) => row.id === 'second')?.seq,
  11
)
response = { cookie: 'invalid-ack', lastMutationIDChanges: { 'integration-client': 0 } }
await assert.rejects(client.pull(), /acknowledgement is outside/)
assert.equal((await client.state()).cookie, 'sequence-rebased')
assert.deepEqual(await client.pending(), [journal[1]])
await client.close()
console.log(
  'ordered replay preserves mutation metadata and rejects regressing acknowledgements'
)

let releasePull!: (value: PullResponse) => void
let pullStarted!: () => void
const pulling = new Promise<void>((resolve) => {
  pullStarted = resolve
})
let localWriteStarted = false
let releasedEarly = false
engine = new ProcessEngine(join(folder, 'network.sqlite'))
await engine.ready
const networkEngine = engine
client = new NativeZero({
  engine: {
    execute(request) {
      if (JSON.parse(request).op === 'beginMutation') localWriteStarted = true
      return networkEngine.execute(request)
    },
    close: () => networkEngine.close(),
  },
  schema,
  mutators,
  transport: {
    async pull() {
      pullStarted()
      return new Promise<PullResponse>((resolve) => {
        releasePull = resolve
      })
    },
    async push() {},
  },
})
const networkPull = client.pull()
await pulling
const duringPull = client.mutate('send', {
  id: 'during-pull',
  text: 'local remains usable',
})
await new Promise<void>((resolve) =>
  setImmediate(() => {
    if (!localWriteStarted) {
      releasedEarly = true
      releasePull({ cookie: 1 })
    }
    resolve()
  })
)
await duringPull
assert.equal(
  releasedEarly,
  false,
  'local mutation must reach native storage before network returns'
)
assert.equal((await client.run<Row[]>(messages))[0].body, 'local remains usable')
releasePull({ cookie: 1 })
await networkPull
assert.equal((await client.pending()).length, 1)
await client.close()

let replayCount = 0
const reviewMutators = {
  async write(
    tx: Parameters<import('../../src/zero/native/types').Mutator>[0],
    args: JSONValue
  ) {
    if (tx.reason === 'rebase') replayCount++
    await tx.mutate.message.upsert(args as Row)
  },
  async insert(
    tx: Parameters<import('../../src/zero/native/types').Mutator>[0],
    args: JSONValue
  ) {
    await tx.mutate.message.insert(args as Row)
  },
  async caught(tx: Parameters<import('../../src/zero/native/types').Mutator>[0]) {
    try {
      await tx.mutate.message.update({ id: 'server', body: 42 })
    } catch {}
    await tx.mutate.message.update({ id: 'server', body: 'recovered' })
  },
  ignored(tx: Parameters<import('../../src/zero/native/types').Mutator>[0]) {
    void tx.mutate.message.update({ id: 'server', body: 42 })
  },
}
engine = new ProcessEngine(join(folder, 'review.sqlite'))
await engine.ready
client = new NativeZero({ engine, schema, mutators: reviewMutators, transport })
response = {
  cookie: 1,
  rowsPatch: [
    put('message', {
      ...message('server', 1, 'base', { keep: true }),
      status: null,
      added: 'server extension',
    }),
    { op: 'put', tableName: 'future_table', value: { id: 'ignored' } },
  ],
}
await client.pull()
await client.mutate('insert', message('server', 99, 'must not replace'))
assert.equal((await client.run<Row[]>(messages))[0].body, 'base')
await client.mutate('write', { id: 'server', body: 'merged' })
assert.deepEqual((await client.run<Row[]>(messages))[0], {
  ...message('server', 1, 'merged', { keep: true }),
  status: null,
  added: 'server extension',
})
await client.mutate('caught')
assert.equal((await client.run<Row[]>(messages))[0].body, 'recovered')
const beforeIgnored = await client.pending()
await assert.rejects(client.mutate('ignored'), /invalid column type/)
assert.deepEqual(await client.pending(), beforeIgnored)
response = { cookie: 2 }
await client.pull()
assert.equal(replayCount, 0, 'unchanged pulls must retain the current optimistic view')
assert.equal((await client.run<Row[]>(messages))[0].body, 'recovered')
await assert.rejects(
  engine.raw({ op: 'beginPull', baseCookie: 'stale', response: { cookie: 3 } }),
  /base cookie/
)
await assert.rejects(
  engine.raw({ op: 'beginPull', queryVersion: 999, response: { cookie: 3 } }),
  /query version/
)
await client.close()

const upgradedSchema = structuredClone(schema)
upgradedSchema.tables.message.columns.newField = { type: 'string', optional: true }
const upgradedSchemaFile = join(folder, 'upgraded-schema.json')
writeFileSync(upgradedSchemaFile, JSON.stringify(upgradedSchema))
const upgradedEngine = new DriverEngine(
  driver,
  join(folder, 'review.sqlite'),
  upgradedSchemaFile,
  'integration-client'
)
await upgradedEngine.ready
client = new NativeZero({
  engine: upgradedEngine,
  schema: upgradedSchema,
  mutators: reviewMutators,
  transport,
})
assert.equal((await client.state()).cookie, null)
assert.deepEqual(await client.pending(), beforeIgnored)
response = {
  cookie: 3,
  rowsPatch: [put('message', message('server', 1, 'fresh snapshot'))],
}
await client.pull([{ hash: 'new-schema', ast: messages.ast }])
assert.equal((await client.run<Row[]>(messages))[0].body, 'recovered')
assert.equal(replayCount, 1)
assert.deepEqual(await client.pending(), beforeIgnored)
response = { cookie: 4, lastMutationIDChanges: { 'integration-client': 999 } }
await assert.rejects(client.pull(), /CLIENT_STATE_NOT_FOUND/)
assert.equal((await client.state()).cookie, 3)
assert.equal((await client.state()).recoveryRequired, 999)
assert.deepEqual(await client.pending(), beforeIgnored)
await assert.rejects(
  client.mutate('write', { id: 'server', body: 'must stay fenced' }),
  /CLIENT_STATE_NOT_FOUND/
)
await assert.rejects(client.push(), /CLIENT_STATE_NOT_FOUND/)
await client.close()

const identityPath = join(folder, 'identity.sqlite')
let generatedEngine = new DriverEngine(driver, identityPath, schemaFile, '')
await generatedEngine.ready
const generatedID = (await generatedEngine.raw({ op: 'state' })).clientID
assert.match(generatedID, /^[a-f0-9]{32}$/)
await generatedEngine.close()
generatedEngine = new DriverEngine(driver, identityPath, schemaFile, '')
await generatedEngine.ready
assert.equal((await generatedEngine.raw({ op: 'state' })).clientID, generatedID)
await generatedEngine.close()
console.log(
  'review regressions passed: nonblocking sync, CRUD merge/no-op, server drift, schema rebase, error handling and recovery fencing'
)

const viewPath = join(folder, 'views.sqlite')
engine = new ProcessEngine(viewPath)
await engine.ready
let viewResponse: PullResponse = {
  cookie: 'views-1',
  rowsPatch: [put('message', message('server', 1, 'view snapshot'))],
  gotQueriesPatch: [{ op: 'put', hash: 'live-messages' }],
}
const viewRequests: readonly import('../../src/zero/native/types').DesiredQuery[][] = []
const viewErrors: unknown[] = []
client = new NativeZero({
  engine,
  schema,
  mutators,
  onError: (error) => viewErrors.push(error),
  transport: {
    async pull(_state, queries) {
      ;(viewRequests as import('../../src/zero/native/types').DesiredQuery[][]).push([
        ...queries,
      ])
      return viewResponse
    },
    async push() {},
  },
})
const view = client.materialize<Row[]>(messages, { hash: 'live-messages', ttl: 'none' })
assert.deepEqual(view.data, [])
const viewEvents: { data: Row[]; type: string; message?: string }[] = []
let viewReady!: () => void
const viewComplete = new Promise<void>((resolve) => {
  viewReady = resolve
})
view.addListener((data, type, error) => {
  viewEvents.push({ data, type, message: error?.message })
  if (type === 'complete') viewReady()
})
await viewComplete
assert.equal(viewEvents[0].type, 'unknown')
assert.equal(view.data[0].body, 'view snapshot')
const sharedView = client.materialize<Row[]>(
  { ...messages, hash: () => 'live-messages' },
  { ttl: 0 }
)
assert.throws(
  () => client.materialize({ ast: { table: 'session' } }, { hash: 'live-messages' }),
  /different queries/
)
await client.mutate('send', { id: 'view-local', text: 'optimistic view' })
assert.equal(view.data[1].body, 'optimistic view')
viewResponse = {
  cookie: 'views-2',
  queryErrors: [{ hash: 'live-messages', message: 'query denied' }],
}
await client.pull()
assert.equal(viewEvents.at(-1)?.type, 'error')
assert.equal(viewEvents.at(-1)?.message, 'query denied')
assert.equal(view.data[1].body, 'optimistic view')
viewResponse = {
  cookie: 'views-3',
  gotQueriesPatch: [{ op: 'put', hash: 'live-messages' }],
}
await client.pull()
assert.equal(viewEvents.at(-1)?.type, 'complete')
assert.equal(view.data[1].body, 'optimistic view')
rejectReplay = true
viewResponse = {
  cookie: 'views-failed',
  rowsPatch: [put('message', message('bad-rebase', 3, 'must roll back'))],
  gotQueriesPatch: [{ op: 'del', hash: 'live-messages' }],
}
await assert.rejects(client.pull(), /replay deliberately failed/)
rejectReplay = false
assert.equal((await client.state()).cookie, 'views-3')
assert.deepEqual((await client.state()).completedQueries, ['live-messages'])
assert.equal(viewEvents.at(-1)?.type, 'complete')
viewResponse = { cookie: 'views-4' }
await client.pull([{ hash: 'manual-messages', ast: messages.ast }])
sharedView.destroy()
await client.pull()
assert.deepEqual(
  viewRequests
    .at(-1)
    ?.map((query) => query.hash)
    .sort(),
  ['live-messages', 'manual-messages']
)
const beforeDestroy = viewEvents.length
view.destroy()
view.destroy()
await client.pull()
assert.deepEqual(
  viewRequests.at(-1)?.map((query) => query.hash),
  ['manual-messages']
)
assert.equal(viewEvents.length, beforeDestroy)
assert.deepEqual(viewErrors, [])
await client.close()
engine = new ProcessEngine(viewPath)
await engine.ready
client = new NativeZero({ engine, schema, mutators })
const reopenedView = client.materialize<Row[]>(messages, { hash: 'live-messages' })
let reopenedType = 'unknown'
reopenedView.addListener((_data, type) => {
  reopenedType = type
})
await client.state()
assert.equal(reopenedType, 'complete')
assert.equal(reopenedView.data[1].body, 'optimistic view')
let inheritedHashType = 'pending'
const inheritedHashView = client.materialize<Row[]>(messages, { hash: 'toString' })
inheritedHashView.addListener((_data, type) => {
  inheritedHashType = type
})
await client.state()
assert.equal(inheritedHashType, 'unknown')
await client.close()
assert.throws(() => reopenedView.addListener(() => {}), /destroyed/)
console.log(
  'materialized views passed: query registration/refcounts, optimistic data, completion/error-only pulls, rollback, disposal and durable reopen'
)

engine = new ProcessEngine(join(folder, 'ttl.sqlite'))
await engine.ready
let ttlQueries: readonly import('../../src/zero/native/types').DesiredQuery[] = []
let expiresSeen = false
let retired!: () => void
const expired = new Promise<void>((resolve) => {
  retired = resolve
})
let ttlCookie = 0
client = new NativeZero({
  engine,
  schema,
  mutators,
  context: { user: 'alice' },
  transport: {
    async pull(_state, queries) {
      ttlQueries = queries
      if (queries.some((query) => query.hash === 'expires')) expiresSeen = true
      else if (expiresSeen) retired()
      return { cookie: ++ttlCookie }
    },
    async push() {},
  },
})
assert.throws(() => client.clientID, /ready/)
await client.ready()
assert.equal(client.clientID, 'integration-client')
assert.deepEqual(client.context, { user: 'alice' })
const retainedView = client.materialize(messages, { hash: 'retained', ttl: 'forever' })
await client.pull()
retainedView.destroy()
await client.pull()
assert.deepEqual(
  ttlQueries.map((query) => query.hash),
  ['retained']
)
const reclaimedView = client.materialize(messages, { hash: 'retained', ttl: 'none' })
await client.state()
reclaimedView.destroy()
await client.pull()
assert.deepEqual(ttlQueries, [])
const expiringView = client.materialize(messages, { hash: 'expires', ttl: 'none' })
await client.pull()
expiringView.updateTTL(1)
expiringView.destroy()
await expired
await client.pull()
assert.deepEqual(ttlQueries, [])
client.materialize(messages, { hash: 'close-cleans-timers', ttl: 'forever' }).destroy()
await client.close()
console.log(
  'query retention passed: shared registration, reclaim, TTL update/expiry, close cleanup and ready identity/context'
)

const syncPath = join(folder, 'sync.sqlite')
engine = new ProcessEngine(syncPath)
await engine.ready
client = new NativeZero({ engine, schema, mutators })
await client.mutate('send', { id: 'offline-start', text: 'durable outbox' })
const originalPending = await client.pending()
await client.close()
engine = new ProcessEngine(syncPath)
await engine.ready
let syncPushes = 0
let syncPulls = 0
let syncAck = 0
const syncRows = new Map<string, Row>()
const syncErrors: unknown[] = []
let connected!: () => void
let wakeSync!: () => void
let wakeUnsubscribed = false
let stalledPull: (() => Promise<PullResponse>) | undefined
client = new NativeZero({
  engine,
  schema,
  mutators,
  onError: (error) => syncErrors.push(error),
  transport: {
    async push(_state, pending) {
      syncPushes++
      if (syncPushes === 1) throw new Error('temporary push failure')
      if (syncPushes === 2) assert.deepEqual(pending, originalPending)
      for (const mutation of pending) {
        const args = mutation.args as { id: string; text: string }
        syncRows.set(args.id, message(args.id, mutation.id, args.text))
        syncAck = mutation.id
      }
    },
    async pull() {
      syncPulls++
      if (stalledPull) {
        const pull = stalledPull
        stalledPull = undefined
        return pull()
      }
      return {
        cookie: syncPulls,
        rowsPatch: [
          { op: 'clear' },
          ...[...syncRows.values()].map((row) => put('message', row)),
        ],
        lastMutationIDChanges: { 'integration-client': syncAck },
      }
    },
  },
})
const nextConnection = () =>
  new Promise<void>((resolve) => {
    connected = resolve
  })
let connection = nextConnection()
const sync = client.startSync({
  pullIntervalMs: 600_000,
  retryMinMs: 1,
  retryMaxMs: 4,
  onStateChange: (state) => {
    if (state.name === 'connected') connected()
  },
  subscribeWake: (request) => {
    wakeSync = request
    return () => {
      wakeUnsubscribed = true
    }
  },
})
await connection
assert.equal(syncPushes, 2)
assert.equal(syncPulls, 2)
assert.equal(syncErrors.length, 1)
assert.deepEqual(await client.pending(), [])
assert.equal((await client.run<Row[]>(messages))[0].body, 'durable outbox')
sync.setOnline(false)
const offlinePulls = syncPulls
await client.mutate('send', { id: 'offline-next', text: 'offline edit' })
assert.equal(syncPulls, offlinePulls)
assert.equal((await client.pending()).length, 1)
connection = nextConnection()
sync.setOnline(true)
await connection
assert.deepEqual(await client.pending(), [])
sync.setActive(false)
const backgroundPulls = syncPulls
await client.mutate('send', { id: 'background', text: 'background edit' })
wakeSync()
assert.equal(syncPulls, backgroundPulls)
connection = nextConnection()
sync.setActive(true)
await connection
assert.deepEqual(await client.pending(), [])
let sawRemote!: () => void
const remoteSeen = new Promise<void>((resolve) => {
  sawRemote = resolve
})
const stopSyncRows = client.subscribe(messages, (rows) => {
  if ((rows as Row[]).some((row) => row.id === 'wake-remote')) sawRemote()
})
await client.state()
syncRows.set('wake-remote', message('wake-remote', 10, 'wake delivered'))
const beforeWake = syncPulls
for (let index = 0; index < 10; index++) wakeSync()
await remoteSeen
assert.equal(syncPulls, beforeWake + 1)
let stalledSyncStarted!: () => void
let releaseStale!: (response: PullResponse) => void
const staleStarted = new Promise<void>((resolve) => {
  stalledSyncStarted = resolve
})
stalledPull = () => {
  stalledSyncStarted()
  return new Promise((resolve) => {
    releaseStale = resolve
  })
}
wakeSync()
await staleStarted
sync.setActive(false)
connection = nextConnection()
sync.setActive(true)
await connection
const beforeStale = (await client.state()).cookie
releaseStale({
  cookie: 'stale',
  rowsPatch: [put('message', message('stale', 99, 'late response'))],
})
assert.equal((await client.state()).cookie, beforeStale)
assert.ok(!(await client.run<Row[]>(messages)).some((row) => row.id === 'stale'))
stopSyncRows()
await client.close()
assert.equal(sync.state.name, 'closed')
assert.ok(wakeUnsubscribed)
assert.equal(syncErrors.length, 1)
console.log(
  'managed sync passed: durable startup outbox, retry, pull after push error, offline/background edits, wake coalescing, cancellation, stale response fencing and close cleanup'
)

const deadlineEngine = new ProcessEngine(join(folder, 'request-deadline.sqlite'))
await deadlineEngine.ready
let finishLatePull!: (response: PullResponse) => void
const deadlineClient = new NativeZero({
  engine: deadlineEngine,
  schema,
  mutators,
  requestTimeoutMs: 10,
  transport: {
    async pull() {
      return new Promise<PullResponse>((resolve) => {
        finishLatePull = resolve
      })
    },
    async push() {},
  },
})
let watchdog: ReturnType<typeof setTimeout>
try {
  await assert.rejects(
    Promise.race([
      deadlineClient.pull(),
      new Promise<never>((_resolve, reject) => {
        watchdog = setTimeout(() => reject(new Error('probe deadline expired')), 2000)
      }),
    ]),
    /request timed out/
  )
  finishLatePull({
    cookie: 1,
    rowsPatch: [put('message', message('late-deadline', 1, 'stale'))],
  })
  assert.equal((await deadlineClient.state()).cookie, null)
  assert.deepEqual(await deadlineClient.run(messages), [])
} finally {
  clearTimeout(watchdog!)
  await deadlineClient.close()
}
const closeEngine = new ProcessEngine(join(folder, 'request-close.sqlite'))
await closeEngine.ready
let closeStarted!: () => void
const closeStart = new Promise<void>((resolve) => {
  closeStarted = resolve
})
const closeClient = new NativeZero({
  engine: closeEngine,
  schema,
  mutators,
  transport: {
    async pull() {
      closeStarted()
      return new Promise<PullResponse>(() => {})
    },
    async push() {},
  },
})
const interrupted = closeClient.pull()
const closedRequest = assert.rejects(interrupted, /sync stopped/)
await closeStart
await closeClient.close()
await closedRequest
console.log(
  'network deadlines and close cancel manual requests even when transport ignores abort'
)

const resultEngine = new ProcessEngine(join(folder, 'mutation-results.sqlite'))
await resultEngine.ready
let resultAck = 0
let rejectResult = false
const resultClient = new NativeZero({
  engine: resultEngine,
  schema,
  mutators: { message: { send: mutators.send, failure: mutators.failure } },
  transport: {
    async pull() {
      return {
        cookie: resultAck,
        rowsPatch: [{ op: 'clear' }],
        lastMutationIDChanges: { 'integration-client': resultAck },
      }
    },
    async push(_state, pending) {
      resultAck = pending[pending.length - 1].id
      return pending.map((mutation) => ({
        id: mutation.id,
        result: rejectResult
          ? { type: 'error' as const, error: { type: 'app' as const, message: 'denied' } }
          : { type: 'success' as const },
      }))
    },
  },
})
const accepted = resultClient.mutate.message.send({
  id: 'accepted',
  text: 'local result',
})
assert.deepEqual(await accepted.client, { type: 'success' })
let acceptedSettled = false
void accepted.server.then(() => {
  acceptedSettled = true
})
assert.equal((await resultClient.pending()).length, 1)
assert.ok(!acceptedSettled)
await resultClient.push()
assert.deepEqual(await accepted.server, { type: 'success' })
assert.equal((await resultClient.pending()).length, 1)
await resultClient.pull()
assert.deepEqual(await resultClient.pending(), [])
rejectResult = true
const denied = resultClient.mutate.message.send({ id: 'denied', text: 'rejected result' })
assert.deepEqual(await denied.client, { type: 'success' })
await assert.rejects(resultClient.push(), /mutation failed: denied/)
assert.deepEqual(await denied.server, {
  type: 'error',
  error: { type: 'app', message: 'denied' },
})
assert.equal((await resultClient.run<Row[]>(messages))[0].id, 'denied')
await resultClient.pull()
assert.deepEqual(await resultClient.run(messages), [])
const failed = resultClient.mutate.message.failure()
await assert.rejects(failed, /mutator deliberately failed/)
assert.equal((await failed.client).type, 'error')
assert.deepEqual(await failed.server, await failed.client)
assert.deepEqual(await resultClient.pending(), [])
const pendingClose = resultClient.mutate.message.send({
  id: 'close',
  text: 'pending at close',
})
await pendingClose.client
await resultClient.close()
assert.deepEqual(await pendingClose.server, {
  type: 'error',
  error: { type: 'zero', message: 'Native Zero client is closed' },
})
console.log(
  'nested mutation results passed: local/server phases, accepted push retains journal, application denial, failed local rollback and close settlement'
)

const requests: { version: number; patch: unknown[] }[] = []
let acknowledgement = 0
let rejectPush = false
const server = createServer(async (request, reply) => {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(Buffer.from(chunk))
  const body = JSON.parse(Buffer.concat(chunks).toString())
  reply.setHeader('content-type', 'application/json')
  if (request.url?.startsWith('/push')) {
    assert.equal(body.mutations[0].type, 'custom')
    assert.deepEqual(body.mutations[0].args, [
      { id: 'http-local', text: 'HTTP mutation' },
    ])
    acknowledgement = body.mutations[0].id
    reply.end(
      JSON.stringify({
        pushResponse: {
          mutations: [
            {
              id: { clientID: 'integration-client', id: acknowledgement },
              result: rejectPush ? { error: 'app', message: 'denied' } : {},
            },
          ],
        },
      })
    )
  } else {
    requests.push(body.queries)
    reply.end(
      JSON.stringify({
        cookie: requests.length,
        rowsPatch: [
          { op: 'clear' },
          put('message', message('server', 1, 'HTTP snapshot')),
        ],
        lastMutationIDChanges: { 'integration-client': acknowledgement },
        gotQueries: {
          version: body.queries.version,
          patch: body.queries.patch
            .filter((query: { op: string }) => query.op === 'put')
            .map((query: { hash: string }) => ({ op: 'put', hash: query.hash })),
        },
      })
    )
  }
})
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
const address = server.address()
if (!address || typeof address === 'string')
  throw new Error('HTTP fixture failed to listen')
const httpOptions = {
  server: `http://127.0.0.1:${address.port}`,
  appID: 'native-proof',
  schemaVersion: '1',
}
try {
  engine = new ProcessEngine(join(folder, 'http.sqlite'))
  await engine.ready
  client = new NativeZero({
    engine,
    schema,
    mutators,
    transport: createOrezTransport(httpOptions),
  })
  await client.pull([{ hash: 'messages', ast: messages.ast }])
  assert.deepEqual((await client.state()).completedQueries, ['messages'])
  const httpMutation = client.mutate('send', { id: 'http-local', text: 'HTTP mutation' })
  assert.deepEqual(await httpMutation.client, { type: 'success' })
  rejectPush = true
  await assert.rejects(client.push(), /Orez mutation failed/)
  assert.deepEqual(await httpMutation.server, {
    type: 'error',
    error: { type: 'app', message: 'denied', details: undefined },
  })
  assert.equal((await client.pending()).length, 1)
  rejectPush = false
  await client.push()
  await client.close()
  engine = new ProcessEngine(join(folder, 'http.sqlite'))
  await engine.ready
  client = new NativeZero({
    engine,
    schema,
    mutators,
    transport: createOrezTransport(httpOptions),
  })
  await client.pull()
  assert.equal(requests[1].version, requests[0].version + 1)
  assert.deepEqual(requests[1].patch, requests[0].patch)
  assert.deepEqual(await client.pending(), [])
  await client.close()
} finally {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  )
}
console.log(
  'Orez HTTP push/pull, wrapped mutation errors and durable desired-query versions passed'
)

const deletionPath = join(folder, 'delete.sqlite')
const openDeletionClient = async () => {
  const engine = new DriverEngine(driver, deletionPath, schemaFile, '')
  await engine.ready
  return new NativeZero({ engine, schema, mutators, transport }).ready()
}
let deletionClient = await openDeletionClient()
const deletedIdentity = deletionClient.clientID
await deletionClient.mutate('send', { id: 'retain-on-delete', text: 'durable command' })
await assert.rejects(deletionClient.delete(), /pending mutations/)
await deletionClient.close()
deletionClient = await openDeletionClient()
assert.equal(deletionClient.clientID, deletedIdentity)
assert.equal((await deletionClient.pending()).length, 1)
assert.equal((await deletionClient.run<Row[]>(messages))[0].id, 'retain-on-delete')
response = { cookie: 1, lastMutationIDChanges: { [deletedIdentity]: 1 } }
await deletionClient.pull()
await deletionClient.delete()
deletionClient = await openDeletionClient()
assert.notEqual(deletionClient.clientID, deletedIdentity)
assert.equal((await deletionClient.state()).cookie, null)
assert.equal((await deletionClient.state()).nextMutationID, 1)
assert.deepEqual(await deletionClient.pending(), [])
assert.deepEqual(await deletionClient.run(messages), [])
await deletionClient.close()
await assert.rejects(deletionClient.delete(), /already closed/)
console.log(
  'store deletion preserved pending commands and reset an acknowledged store identity'
)

const referencePath = process.env.ONE_ZERO_REFERENCE
if (!referencePath)
  throw new Error(
    'ONE_ZERO_REFERENCE must name the installed Zero reference entry for differential coverage'
  )
const reference = await import(referencePath)
const refMessage = reference
  .table('message')
  .columns({
    id: reference.string(),
    session: reference.string(),
    seq: reference.number(),
    body: reference.string(),
    status: reference.string(),
    extra: reference.json().optional(),
  })
  .primaryKey('id')
const refSession = reference
  .table('session')
  .columns({
    id: reference.string(),
    title: reference.string(),
    state: reference.string(),
  })
  .primaryKey('id')
const refSchema = reference.createSchema({
  tables: [refMessage, refSession],
  relationships: [
    reference.relationships(refMessage, ({ one }: any) => ({
      sessionRow: one({
        sourceField: ['session'],
        destField: ['id'],
        destSchema: refSession,
      }),
    })),
    reference.relationships(refSession, ({ many }: any) => ({
      messages: many({
        sourceField: ['id'],
        destField: ['session'],
        destSchema: refMessage,
      }),
    })),
  ],
})
const registry = reference.defineMutators({
  seed: reference.defineMutator(
    async ({
      tx,
      args,
    }: {
      tx: { mutate: { message: { upsert: (row: Row) => Promise<void> } } }
      args: Row
    }) => {
      await tx.mutate.message.upsert(args)
    }
  ),
  seedSession: reference.defineMutator(
    async ({
      tx,
      args,
    }: {
      tx: { mutate: { session: { upsert: (row: Row) => Promise<void> } } }
      args: Row
    }) => {
      await tx.mutate.session.upsert(args)
    }
  ),
})
const zero = new reference.Zero({
  schema: refSchema,
  server: null,
  userID: 'native-differential',
  kvStore: 'mem',
  mutators: registry,
  logSink: { log() {} },
})
const builder = reference.createBuilder(refSchema)
engine = new ProcessEngine(join(folder, 'differential.sqlite'))
await engine.ready
const rows = [
  message('a', 1, 'alpha', { nested: ['x', null, true] }),
  message('b', 2, 'Beta'),
  message('c', 2, 'a_b'),
  message('d', 4, '\uE000'),
  message('e', 5, '😀'),
  message('f', 6, 'line\nbreak'),
  message('g', 7, 'a%b'),
]
const refSessionRow = { id: 's1', title: 'joined session', state: 'idle' }
const seed = await engine.raw({
  op: 'beginPull',
  response: {
    cookie: 1,
    rowsPatch: [put('session', refSessionRow), ...rows.map((row) => put('message', row))],
  },
})
await engine.raw({ op: 'commitPull', transaction: seed.transaction })
for (const row of rows) await zero.mutate(registry.seed(row)).client
await zero.mutate(registry.seedSession(refSessionRow)).client
client = new NativeZero({ engine, schema, mutators: {} })
const cases = [
  builder.message.orderBy('seq', 'asc'),
  builder.message.orderBy('seq', 'desc').limit(3),
  builder.message.where('body', 'LIKE', 'a%'),
  builder.message.where('body', 'LIKE', 'a\\_b'),
  builder.message.where('body', 'LIKE', 'a\\%b'),
  builder.message.where('body', 'LIKE', '%\n%'),
  builder.message.where('id', 'IN', ['a', 'e']),
  builder.message.where('id', 'NOT IN', []),
  builder.message.where('extra', 'IS', null),
  builder.message.orderBy('body', 'asc'),
  builder.message.orderBy('seq', 'asc').start({ id: 'b', seq: 2 }, { inclusive: false }),
  builder.message.orderBy('seq', 'desc').start({ id: 'c', seq: 2 }, { inclusive: true }),
  builder.message.where(({ or, cmp }: any) =>
    or(cmp('seq', '<', 2), cmp('seq', '>=', 5))
  ),
  builder.message.where('id', 'a').one(),
  builder.message.where('id', 'absent').one(),
  builder.message.related('sessionRow'),
  builder.session.related('messages', (q: any) => q.orderBy('seq', 'desc').limit(2)),
  builder.session.whereExists('messages', (q: any) => q.where('body', 'alpha')),
]
for (const query of cases) {
  const expected = await zero.run(query)
  const actual = await client.run(query)
  assert.deepEqual(
    actual,
    expected === undefined ? undefined : JSON.parse(JSON.stringify(expected)),
    JSON.stringify(query.ast)
  )
}
await zero.close()
await client.close()
console.log(`native query differential passed ${cases.length} actual Zero query cases`)
