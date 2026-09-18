import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { available, ios, readInventory, type Declaration } from './inventory'

export type ManifestCoverage = {
  views: Record<string, string[]>
  modifiers: Record<string, string[]>
}

export type SetCoverage = {
  mapped: number
  total: number
  aboveCeiling: number
  mappedNames: string[]
  unmappedNames: string[]
}

export type CoverageReport = {
  targetSdk: number
  declarations: number
  modules: Record<string, { views: SetCoverage; modifiers: SetCoverage }>
  totals: { views: SetCoverage; modifiers: SetCoverage }
}

const shortOwner = (declaration: Declaration) => declaration.owner.split('.').at(-1)

// a view is a top-level struct declaration. SwiftSyntax is not a type checker, so View
// conformance is not derivable from the interface; structs are the mining universe,
// not a parity denominator. underscore-prefixed names are SPI, never bindable API.
const isViewShape = (declaration: Declaration) =>
  declaration.kind === 'struct' &&
  declaration.owner === '' &&
  !declaration.name.startsWith('_') &&
  available(declaration)

const isViewModifierShape = (declaration: Declaration) =>
  declaration.kind === 'func' &&
  shortOwner(declaration) === 'View' &&
  !declaration.name.startsWith('_') &&
  available(declaration)

const emptySet = (): SetCoverage => ({
  mapped: 0,
  total: 0,
  aboveCeiling: 0,
  mappedNames: [],
  unmappedNames: [],
})

export function computeCoverage(
  inventory: readonly Declaration[],
  coverage: ManifestCoverage,
  modules: readonly string[],
  // the generator binds nothing above the ceiling, so the hill-climb universe stops
  // there too; above-ceiling names are counted separately instead of as unmapped.
  ceiling: number
): Omit<CoverageReport, 'targetSdk' | 'declarations'> {
  const universe = new Map<
    string,
    { views: Set<string>; modifiers: Set<string>; aboveViews: Set<string>; aboveModifiers: Set<string> }
  >()
  for (const module of modules)
    universe.set(module, {
      views: new Set(),
      modifiers: new Set(),
      aboveViews: new Set(),
      aboveModifiers: new Set(),
    })
  for (const declaration of inventory) {
    const sets = universe.get(declaration.module)
    if (!sets) continue
    const above = ios(declaration) > ceiling
    if (isViewShape(declaration)) (above ? sets.aboveViews : sets.views).add(declaration.name)
    else if (isViewModifierShape(declaration))
      (above ? sets.aboveModifiers : sets.modifiers).add(declaration.name)
  }
  const report: Record<string, { views: SetCoverage; modifiers: SetCoverage }> = {}
  const totals = { views: emptySet(), modifiers: emptySet() }
  for (const [module, sets] of universe) {
    const views = diff(sets.views, sets.aboveViews.size, coverage.views[module] ?? [])
    const modifiers = diff(
      sets.modifiers,
      sets.aboveModifiers.size,
      coverage.modifiers[module] ?? []
    )
    report[module] = { views, modifiers }
    for (const [key, set] of [
      ['views', views],
      ['modifiers', modifiers],
    ] as const) {
      totals[key].mapped += set.mapped
      totals[key].total += set.total
      totals[key].aboveCeiling += set.aboveCeiling
      totals[key].mappedNames.push(...set.mappedNames.map((name) => `${module}.${name}`))
      totals[key].unmappedNames.push(...set.unmappedNames.map((name) => `${module}.${name}`))
    }
  }
  totals.views.mappedNames.sort()
  totals.views.unmappedNames.sort()
  totals.modifiers.mappedNames.sort()
  totals.modifiers.unmappedNames.sort()
  return { modules: report, totals }
}

function diff(
  universe: Set<string>,
  aboveCeiling: number,
  covered: readonly string[]
): SetCoverage {
  // a covered name outside the universe means the manifest and the SDK drifted apart
  // (a rename or a removal upstream). it still counts as mapped: the binding exists
  // and generate.ts selected it from this same inventory.
  const mappedNames = [...new Set(covered)].sort()
  const unmappedNames = [...universe].filter((name) => !mappedNames.includes(name)).sort()
  const total = new Set([...universe, ...mappedNames]).size
  return { mapped: mappedNames.length, total, aboveCeiling, mappedNames, unmappedNames }
}

// importing this module only loads computeCoverage (the unit tests do that); the
// report itself runs only when bun executes the file directly.
if (import.meta.main) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const { modules, inventory } = readInventory(root)
  const manifest = JSON.parse(
    readFileSync(join(root, 'codegen/swiftui-manifest.json'), 'utf8')
  ) as { sdk: string; coverage: ManifestCoverage }
  // the manifest records the ceiling, not the toolchain: output must be identical on
  // every SDK at or above it, so the report only requires the toolchain to reach it.
  const ceiling = Number(manifest.sdk)
  const sdk = execFileSync('xcrun', ['--sdk', 'iphonesimulator', '--show-sdk-version'], {
    encoding: 'utf8',
  }).trim()
  if (Number(sdk.split('.')[0]) < ceiling) {
    console.error(
      `warning: bindings target SDK ${ceiling} but the toolchain provides ${sdk}; regenerate first`
    )
  }
  const { modules: byModule, totals } = computeCoverage(
    inventory,
    manifest.coverage,
    modules,
    ceiling
  )
  const report: CoverageReport = {
    targetSdk: ceiling,
    declarations: inventory.length,
    modules: byModule,
    totals,
  }

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    const width = Math.max(...modules.map((module) => module.length), 'module'.length)
    console.log(
      `${'module'.padEnd(width)}  views mapped/total  modifiers mapped/total`
    )
    for (const module of modules) {
      const { views, modifiers } = byModule[module]
      console.log(
        `${module.padEnd(width)}  ${String(views.mapped).padStart(5)} / ${String(views.total).padEnd(5)}  ${String(modifiers.mapped).padStart(5)} / ${String(modifiers.total).padEnd(5)}`
      )
    }
    console.log(
      `${'total'.padEnd(width)}  ${String(totals.views.mapped).padStart(5)} / ${String(totals.views.total).padEnd(5)}  ${String(totals.modifiers.mapped).padStart(5)} / ${String(totals.modifiers.total).padEnd(5)}`
    )
  console.log(
    `\ntarget SDK ${report.targetSdk} (toolchain ${sdk}): ${report.declarations} declarations, ` +
      `${totals.views.aboveCeiling} views and ${totals.modifiers.aboveCeiling} modifiers above the ceiling. ` +
      `views are top-level structs, modifiers are View funcs, both minus SPI; View conformance is not derivable from syntax.`
    )
  }
}
