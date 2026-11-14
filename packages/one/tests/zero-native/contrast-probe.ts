import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Zero, defineMutator, defineMutators } from '@rocicorp/zero'
import { createZeroClient } from 'on-zero'
import { schema } from 'native-zero-consumer/schema'
import * as groupedQueries from 'native-zero-consumer/grouped-queries'
import { MOBILE_SYNC_QUERIES } from 'native-zero-consumer/mobile-manifest'
import {
  projectInstanceTables,
  repoInstanceTables,
  usrInstanceTables,
} from 'native-zero-consumer/instance-tables'
import { NativeZero } from '../../src/zero/native/client'
import { DriverEngine } from './engine'

createZeroClient({ schema, models: {}, groupedQueries })
const context = {
  userId: 'native-user',
  projectId: 'native-project',
  threadId: 'native-thread',
  historyCursor: { createdAt: 100, id: 'row-z' },
  docPath: 'plans/product.md',
}
const root = mkdtempSync(join(process.env.ONE_ZERO_TEST_DIR!, 'contrast-queries-'))
writeFileSync(root + '/schema.json', JSON.stringify(schema))
const sets = {
  usr: usrInstanceTables,
  project: projectInstanceTables,
  repo: repoInstanceTables,
}
const references: any = {},
  natives: any = {}
const registry = defineMutators({
  seed: defineMutator(async ({ tx, args }: any) => {
    for (const item of args) await tx.mutate[item.table].upsert(item.row)
  }),
})
const fixtureRows: Record<string, any[]> = {}
for (const [table, definition] of Object.entries(schema.tables) as any) {
  fixtureRows[table] = Array.from({ length: 3 }, (_, index) => {
    const row: any = {}
    for (const [name, column] of Object.entries(definition.columns) as any) {
      if (name === 'userId') row[name] = context.userId
      else if (name === 'projectId') row[name] = context.projectId
      else if (name === 'threadId') row[name] = context.threadId
      else if (name === 'repoResourceId') row[name] = 'native-repo'
      else if (name === 'id')
        row[name] =
          table === 'project'
            ? context.projectId
            : table === 'userPublic'
              ? context.userId
              : `row-${index}`
      else if (name === 'parentId') row[name] = index ? 'row-0' : null
      else if (column.type === 'string')
        row[name] =
          name === 'status'
            ? ['ready', 'in-progress', 'done'][index]
            : name === 'state'
              ? 'active'
              : name === 'role'
                ? ['user', 'assistant', 'tool'][index]
                : name === 'path'
                  ? [context.docPath, 'plans/notes.md', 'src/main.ts'][index]
                  : name.endsWith('Id')
                    ? 'row-0'
                    : `${name}-${index}`
      else if (column.type === 'number') row[name] = index + 1
      else if (column.type === 'boolean') row[name] = index % 2 === 0
      else if (column.type === 'json') row[name] = null
      else throw new Error('unrecognized schema column ' + column.type)
    }
    for (const key of definition.primaryKey)
      if (
        typeof row[key] === 'string' &&
        key !== 'id' &&
        !['userId', 'projectId', 'threadId'].includes(key)
      )
        row[key] += '-' + index
    return row
  })
  const seen = new Set<string>()
  fixtureRows[table] = fixtureRows[table].filter((row) => {
    const key = JSON.stringify(definition.primaryKey.map((key: string) => row[key]))
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
function observable(value: any): any {
  if (Array.isArray(value)) return value.map(observable)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, observable(child)])
    )
  return value
}
let matches = 0,
  nonempty = 0
const queryCounts: Record<string, number> = { usr: 0, project: 0, repo: 0 }
try {
  for (const [plane, tables] of Object.entries(sets)) {
    const engine = new DriverEngine(
      process.env.ONE_ZERO_DRIVER!,
      root + '/' + plane + '.sqlite',
      root + '/schema.json',
      plane + '-native'
    )
    await engine.ready
    const seed = tables.flatMap((table) =>
      fixtureRows[table].map((row) => ({ table, row }))
    )
    const pull = await engine.raw({
      op: 'beginPull',
      response: {
        cookie: 1,
        rowsPatch: seed.map(({ table, row }) => ({
          op: 'put',
          tableName:
            schema.tables[table as keyof typeof schema.tables].serverName ?? table,
          value: row,
        })),
      },
    })
    await engine.raw({ op: 'commitPull', transaction: pull.transaction })
    natives[plane] = new NativeZero({ engine, schema, mutators: {} })
    const reference = new Zero({
      schema,
      server: null,
      userID: plane + '-reference',
      kvStore: 'mem',
      mutators: registry,
      logSink: { log() {} },
    })
    await reference.mutate(registry.seed(seed as never)).client
    references[plane] = reference
  }
  for (const entry of MOBILE_SYNC_QUERIES) {
    let args: any
    entry.prepare(context, (_name, values) => {
      args = values[0]
      return 'reference'
    })
    const query = (entry.query as any)(args)
    const expected = await references[entry.plane].run(query)
    const actual = await natives[entry.plane].run(query)
    assert.deepEqual(actual, observable(expected), entry.queryName)
    matches++
    queryCounts[entry.plane]++
    if (Array.isArray(actual) ? actual.length : actual !== undefined) nonempty++
  }
  const repoCases = [
    ['repoLink', 'repoLinkById', { repoResourceId: 'native-repo' }],
    ['sootRepoConfig', 'repoConfig', { repoResourceId: 'native-repo' }],
    ['sootBuild', 'buildsByRepo', { repoResourceId: 'native-repo' }],
    ['sootBuild', 'buildsByRepo', { repoResourceId: 'native-repo', before: 3, limit: 1 }],
    [
      'sootPreviewShare',
      'previewSharesByRepo',
      { repoResourceId: 'native-repo', before: 3, limit: 2 },
    ],
    ['sootRun', 'runsByRepo', { repoResourceId: 'native-repo' }],
    [
      'sootRun',
      'runsByRepo',
      {
        repoResourceId: 'native-repo',
        filters: {
          branch: 'branch-1',
          status: 'in-progress',
          kind: 'kind-1',
          source: 'source-1',
          pullRequestNumber: 2,
        },
        limit: 1,
      },
    ],
    ['sootScreenshotDeck', 'screenshotDecksByRepo', { repoResourceId: 'native-repo' }],
  ] as const
  for (const [namespace, name, args] of repoCases) {
    const query = (groupedQueries as any)[namespace][name](args)
    assert.deepEqual(
      await natives.repo.run(query),
      observable(await references.repo.run(query)),
      namespace + '.' + name
    )
    matches++
    queryCounts.repo++
  }
  assert.ok(
    nonempty >= 10,
    `at least ten real mobile queries must return populated fixtures, got ${nonempty}`
  )
  console.log(
    JSON.stringify({
      matched: matches,
      populatedMobileQueries: nonempty,
      tables: Object.keys(schema.tables).length,
      queryCounts,
      mobileQueries: MOBILE_SYNC_QUERIES.length,
      repoQueries: repoCases.length,
    })
  )
} finally {
  await Promise.all(
    [...Object.values(references), ...Object.values(natives)].map((client: any) =>
      client.close()
    )
  )
}
