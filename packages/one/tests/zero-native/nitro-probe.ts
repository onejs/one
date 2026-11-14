import { AbortController } from 'abort-controller'
import { createNativeZero } from '../../src/zero/native/nitro'
import type { PullResponse, Row } from '../../src/zero/native/types'

Object.assign(globalThis, {
  AbortController,
  queueMicrotask: (fn: () => void) => Promise.resolve().then(fn),
})
const report = (
  globalThis as unknown as { report: (text: string, failed?: boolean) => void }
).report
const checks: string[] = []
function check(condition: unknown, label: string) {
  if (!condition) throw new Error(label)
  checks.push(label)
}
async function run() {
  check('HermesInternal' in globalThis, 'actual Hermes runtime')
  const schema = {
    tables: {
      message: {
        name: 'message',
        primaryKey: ['id'],
        columns: {
          id: { type: 'string' },
          body: { type: 'string' },
          seq: { type: 'number' },
        },
      },
    },
  }
  const query = { ast: { table: 'message', orderBy: [['seq', 'asc']] } }
  let response: PullResponse = {
    cookie: 1,
    rowsPatch: [
      { op: 'clear' },
      {
        op: 'put',
        tableName: 'message',
        value: { id: 'remote', body: 'original', seq: 1 },
      },
    ],
  }
  const options = {
    name: 'nitro-proof',
    schema,
    mutators: {
      async send(tx: import('../../src/zero/native/types').Transaction) {
        const latest = await tx.run<Row>({
          ast: { table: 'message', orderBy: [['seq', 'desc']], limit: 1 },
          format: { singular: true },
        })
        await tx.mutate.message.upsert({
          id: 'local',
          body: 'native message',
          seq: Number(latest?.seq ?? 0) + 1,
        })
      },
      async recover(tx: import('../../src/zero/native/types').Transaction) {
        try {
          await tx.mutate.message.update({ id: 'local', body: 42 })
        } catch {}
        await tx.mutate.message.update({ id: 'local', body: 'recovered' })
      },
    },
    transport: {
      async pull() {
        return response
      },
      async push() {},
    },
  }
  let client = await createNativeZero(options)
  const identity = (await client.state()).clientID
  await client.pull()
  check((await client.run<Row[]>(query)).length === 1, 'Nitro async native query')
  await client.mutate('send')
  check(
    (await client.run<Row[]>(query))[1].seq === 2,
    'JS mutator awaits native transaction query and write'
  )
  response = {
    cookie: 2,
    rowsPatch: [
      {
        op: 'put',
        tableName: 'message',
        value: { id: 'remote2', body: 'arrived', seq: 2 },
      },
    ],
  }
  await client.pull()
  check(
    (await client.run<Row[]>(query))[2].seq === 3,
    'native pull replays JS callback atomically'
  )
  await client.close()
  client = await createNativeZero(options)
  check(
    (await client.state()).clientID === identity,
    'native store owns a durable generated client identity'
  )
  check((await client.pending()).length === 1, 'pending mutation survives native reopen')
  check(
    (await client.run<Row[]>(query))[2].seq === 3,
    'optimistic view survives native reopen'
  )
  response = {
    cookie: 3,
    lastMutationIDChanges: { [identity]: 1 },
    rowsPatch: [
      {
        op: 'put',
        tableName: 'message',
        value: { id: 'local', body: 'native message', seq: 3 },
      },
    ],
  }
  await client.pull()
  check(
    (await client.pending()).length === 0 && (await client.state()).cookie === 3,
    'native acknowledgement and cursor commit together'
  )
  await client.mutate('recover')
  check(
    (await client.run<Row[]>(query))[2].body === 'recovered',
    'caught native write failure can recover in Hermes'
  )
  response = { cookie: 4, gotQueriesPatch: [{ op: 'put', hash: 'nitro-live' }] }
  const view = client.materialize<Row[]>(query, { hash: 'nitro-live' })
  let complete!: () => void
  const completed = new Promise<void>((resolve) => {
    complete = resolve
  })
  view.addListener((_data, resultType) => {
    if (resultType === 'complete') complete()
  })
  await completed
  check(
    view.data[2].body === 'recovered',
    'materialized native view retains optimistic data across completion-only pull'
  )
  check(
    (await client.state()).completedQueries.includes('nitro-live'),
    'native query completion persists through Nitro'
  )
  view.destroy()
  await client.close()
  let closed = false
  try {
    await client.run(query)
  } catch {
    closed = true
  }
  check(closed, 'closed client rejects later operations')
  report(JSON.stringify({ passed: checks.length, checks }))
}
run().catch((error) =>
  report(
    JSON.stringify({
      failed: error instanceof Error ? error.stack : String(error),
      checks,
    }),
    true
  )
)
