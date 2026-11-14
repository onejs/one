import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
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
    resolve(here, '../../cpp/zero'),
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
  await client.mutate('send', { id: 'http-local', text: 'HTTP mutation' })
  rejectPush = true
  await assert.rejects(client.push(), /Orez mutation failed/)
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
