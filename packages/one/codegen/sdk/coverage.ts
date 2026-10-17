// computes how much of each sdk framework crosses to typescript, with the
// reason for every symbol that does not. run from packages/one:
//   bun codegen/sdk/coverage.ts [--extract] [--json out.json] [Module...]
import { writeFileSync } from 'node:fs'
import { Bridge, buildIndex, collectFacts, inUniverse, judge, type IndexFacts } from './bridge'
import { extractGraphs, loadGraph, sdkModules, type Symbol } from './graph'

export type FrameworkCoverage = {
  module: string
  total: number
  covered: number
  deprecated: number
  reasons: Record<string, number>
  examples: Record<string, string[]>
}

export async function coverage(modules: string[], { extract = false } = {}) {
  const all = sdkModules()
  const failed = extract ? (await extractGraphs(all)).failed : []
  // the index spans every module, since a framework's api names types from others
  const facts: IndexFacts[] = []
  for (const module of all) {
    const graph = loadGraph(module)
    if (graph) facts.push(collectFacts(graph))
  }
  const bridge = new Bridge(buildIndex(facts))
  const results: FrameworkCoverage[] = []
  for (const module of modules) {
    const graph = loadGraph(module)
    if (!graph) continue
    const byUsr = new Map(graph.symbols.map((s) => [s.identifier.precise, s]))
    const owners = new Map<string, Symbol | undefined>()
    const requirements = new Set<string>()
    for (const rel of graph.relationships) {
      if (rel.kind === 'memberOf') owners.set(rel.source, byUsr.get(rel.target))
      if (rel.kind === 'requirementOf' || rel.kind === 'optionalRequirementOf') requirements.add(rel.source)
    }
    const result: FrameworkCoverage = { module, total: 0, covered: 0, deprecated: 0, reasons: {}, examples: {} }
    const seen = new Set<string>()
    for (const symbol of graph.symbols) {
      if (seen.has(symbol.identifier.precise)) continue
      seen.add(symbol.identifier.precise)
      if (!inUniverse(symbol, requirements)) continue
      result.total++
      if (symbol.availability?.some((a) => a.isUnconditionallyDeprecated || (a.domain === 'iOS' && a.deprecated))) {
        result.deprecated++
      }
      const verdict = judge(bridge, symbol, owners.get(symbol.identifier.precise))
      if (verdict.covered) {
        result.covered++
        continue
      }
      result.reasons[verdict.reason] = (result.reasons[verdict.reason] ?? 0) + 1
      const examples = (result.examples[verdict.reason] ??= [])
      if (examples.length < 5) examples.push(symbol.pathComponents.join('.'))
    }
    results.push(result)
  }
  return { results, failed }
}

const percent = (covered: number, total: number) => (total ? ((covered / total) * 100).toFixed(1) : '100.0')

if (import.meta.main) {
  const args = process.argv.slice(2)
  const jsonAt = args.indexOf('--json')
  const jsonOut = jsonAt >= 0 ? args[jsonAt + 1] : undefined
  const named = args.filter((arg, i) => !arg.startsWith('--') && (jsonAt < 0 || i !== jsonAt + 1))
  const { results, failed } = await coverage(named.length ? named : sdkModules(), {
    extract: args.includes('--extract'),
  })
  const total = results.reduce((n, r) => n + r.total, 0)
  const covered = results.reduce((n, r) => n + r.covered, 0)
  const reasons: Record<string, number> = {}
  for (const r of results) for (const [reason, n] of Object.entries(r.reasons)) reasons[reason] = (reasons[reason] ?? 0) + n
  for (const r of [...results].sort((a, b) => b.total - a.total)) {
    const top = Object.entries(r.reasons).sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([reason, n]) => `${reason} ${n}`).join(', ')
    console.log(`${r.module.padEnd(32)} ${String(r.covered).padStart(6)}/${String(r.total).padEnd(6)} ${percent(r.covered, r.total).padStart(5)}%  ${top}`)
  }
  console.log(`\n${results.length} frameworks: ${covered}/${total} symbols, ${percent(covered, total)}%`)
  for (const [reason, n] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) console.log(`  ${reason}: ${n}`)
  for (const f of failed) console.log(`not extractable: ${f.module}: ${f.error}`)
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ results, failed }, null, 2))
}
