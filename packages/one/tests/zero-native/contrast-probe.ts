import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Zero, defineMutator, defineMutators } from '@rocicorp/zero'
import { asQueryInternals } from '@rocicorp/zero/bindings'
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
  historyCursor: { createdAt: 2, id: 'row-1' },
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
const cases = MOBILE_SYNC_QUERIES.map((entry) => {
  let args: any
  entry.prepare(context, (_name, values) => {
    args = values[0]
    return 'reference'
  })
  return { plane: entry.plane, name: entry.queryName, query: (entry.query as any)(args) }
})
for (const [namespace, name, args] of repoCases)
  cases.push({
    plane: 'repo',
    name: namespace + '.' + name,
    query: (groupedQueries as any)[namespace][name](args),
  })

const fixtureRows: Record<string, any[]> = {}
for (const [table, definition] of Object.entries(schema.tables) as any) {
  fixtureRows[table] = Array.from({ length: 4 }, (_, index) => {
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
            ? ['ready', 'in-progress', 'done', 'ready'][index]
            : name === 'state'
              ? 'active'
              : name === 'role'
                ? ['user', 'assistant', 'tool', 'assistant'][index]
                : name === 'path'
                  ? [
                      context.docPath,
                      'plans/notes.md',
                      'src/main.ts',
                      'plans/history.md',
                    ][index]
                  : name.endsWith('Id')
                    ? 'row-0'
                    : `${name}-${index}`
      else if (column.type === 'number') row[name] = [1, 2, 2, 3][index]
      else if (column.type === 'boolean') row[name] = index % 2 === 0
      else if (column.type === 'json') row[name] = null
      else throw new Error('unrecognized schema column ' + column.type)
    }
    for (const key of definition.primaryKey)
      if (
        typeof row[key] === 'string' &&
        key !== 'id' &&
        !['userId', 'projectId', 'threadId', 'repoResourceId'].includes(key)
      )
        row[key] += '-' + index
    return row
  })
}
function clauses(condition: any): any[][] {
  if (!condition) return [[]]
  if (condition.type === 'simple') return [[condition]]
  if (condition.type === 'or') return condition.conditions.flatMap(clauses)
  if (condition.type === 'and')
    return condition.conditions.reduce(
      (all: any[][], child: any) =>
        all.flatMap((left) => clauses(child).map((right) => [...left, ...right])),
      [[]]
    )
  return [[]]
}
for (const [index, entry] of cases.entries()) {
  const ast = asQueryInternals(entry.query).ast
  for (const [branch, predicates] of clauses(ast.where).entries()) {
    const row = { ...fixtureRows[ast.table][0] }
    if (typeof row.id === 'string') row.id = `fixture-${index}-${branch}`
    for (const predicate of predicates) {
      if (predicate.left.type !== 'column' || predicate.right.type !== 'literal') continue
      const key = predicate.left.name,
        value = predicate.right.value
      if (predicate.op === '=' || predicate.op === 'IS') row[key] = value
      else if (predicate.op === 'IN') row[key] = value[0]
      else if (predicate.op === 'LIKE')
        row[key] = value.replace(
          /\\(.)|%|_/g,
          (match: string, escaped: string) =>
            escaped ?? (match === '%' ? `fixture-${index}-${branch}` : 'x')
        )
      else if (predicate.op === '>' || predicate.op === '>=') row[key] = value + 1
      else if (predicate.op === '<' || predicate.op === '<=') row[key] = value - 1
      else if (predicate.op === '!=' && row[key] === value) row[key] = 'fixture-other'
    }
    fixtureRows[ast.table].push(row)
  }
}
const outside = new Map<string, Map<string, Set<string>>>()
for (const [table, rows] of Object.entries(fixtureRows)) {
  const definition = schema.tables[table as keyof typeof schema.tables]
  const key = (value: any) =>
    JSON.stringify(definition.primaryKey.map((name: string) => value[name]))
  const excluded = new Map<string, Set<string>>()
  outside.set(table, excluded)
  for (const [index, source] of [...rows].entries()) {
    for (const name of ['userId', 'projectId', 'threadId', 'repoResourceId']) {
      if (!(name in source)) continue
      const row = { ...source, [name]: source[name] + '-outside' }
      if (typeof row.id === 'string') row.id += `-outside-${name}-${index}`
      if (key(row) === key(source)) {
        const primary = definition.primaryKey.find(
          (field: string) => typeof row[field] === 'string'
        )!
        row[primary] += `-outside-${name}-${index}`
      }
      let keys = excluded.get(name)
      if (!keys) excluded.set(name, (keys = new Set()))
      keys.add(key(row))
      rows.push(row)
    }
  }
  fixtureRows[table] = [...new Map(rows.map((value) => [key(value), value])).values()]
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
  let populatedRepoQueries = 0
  for (const entry of cases) {
    const expected = observable(await references[entry.plane].run(entry.query))
    const actual = await natives[entry.plane].run(entry.query)
    assert.deepEqual(actual, expected, entry.name)
    const rows = Array.isArray(expected)
      ? expected
      : expected === undefined
        ? []
        : [expected]
    assert.ok(rows.length > 0, entry.name + ' must return a fixture')
    const ast = asQueryInternals(entry.query).ast
    const definition = schema.tables[ast.table as keyof typeof schema.tables]
    const scopeKeys = new Set(
      clauses(ast.where)
        .flat()
        .filter((predicate: any) => predicate.left.type === 'column')
        .map((predicate: any) => predicate.left.name)
    )
    const excluded = [...outside.get(ast.table)!]
      .filter(([name]) => scopeKeys.has(name))
      .flatMap(([, keys]) => [...keys])
    assert.ok(excluded.length > 0, entry.name + ' must have another scope in the store')
    assert.ok(
      rows.every(
        (row: any) =>
          !excluded.includes(
            JSON.stringify(definition.primaryKey.map((key: string) => row[key]))
          )
      ),
      entry.name + ' must exclude the queried scope'
    )
    matches++
    queryCounts[entry.plane]++
    if (entry.plane === 'repo') populatedRepoQueries++
    else nonempty++
  }
  const messageCases = cases.filter(
    (entry) =>
      entry.name === 'message.messagesByThread' ||
      entry.name === 'message.messagesBeforeInThread'
  )
  const full = await natives.project.run(
    messageCases.find((entry) => entry.name === 'message.messagesByThread')!.query
  )
  const before = await natives.project.run(
    messageCases.find((entry) => entry.name === 'message.messagesBeforeInThread')!.query
  )
  assert.ok(
    full.filter((row: any) => row.createdAt === 2).length >= 2,
    'message order must include sort ties'
  )
  assert.ok(
    before.length > 0 && before.length < full.length,
    'history cursor must split the fixtures'
  )
  assert.equal(populatedRepoQueries, repoCases.length)
  assert.equal(nonempty, MOBILE_SYNC_QUERIES.length)
  console.log(
    JSON.stringify({
      matched: matches,
      populatedMobileQueries: nonempty,
      populatedRepoQueries,
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
