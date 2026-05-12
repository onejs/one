import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import colors from 'picocolors'

/**
 * Marker that identifies a bundler config as One-generated. If the file
 * still contains this marker we can safely regenerate it; if the user
 * removed the marker we treat the file as customized and never overwrite.
 */
export const ONE_GENERATED_MARKER = '@one/generated bundler-config'

const BABEL_CONFIG = `// ${ONE_GENERATED_MARKER}
//
// Delegates to one/babel-preset so that expo export, eas update, and
// any other Metro-direct tool produces byte-equivalent bundles to what
// \`one dev\` and \`one build\` produce internally.
//
// Safe to commit. Re-generate with: \`one generate-bundler-config --force\`
// To customize, remove this header and edit freely — the CLI will then
// refuse to overwrite.

module.exports = require('one/babel-preset')
`

const METRO_CONFIG = `// ${ONE_GENERATED_MARKER}
//
// Wraps the default Metro config with One's resolver overrides (server-only
// stripping, .css → empty, react-native-svg fix). Used by expo export,
// eas update, and any other Metro-direct workflow.
//
// Safe to commit. Re-generate with: \`one generate-bundler-config --force\`
// To customize, remove this header and edit freely — the CLI will then
// refuse to overwrite.

const { getDefaultConfig } = require('expo/metro-config')
const { withOne } = require('one/metro-config')

module.exports = withOne(getDefaultConfig(__dirname))
`

const FILES = [
  { name: 'babel.config.cjs', content: BABEL_CONFIG, conflicting: ['babel.config.js', 'babel.config.mjs', '.babelrc', '.babelrc.js'] },
  { name: 'metro.config.cjs', content: METRO_CONFIG, conflicting: ['metro.config.js', 'metro.config.mjs'] },
] as const

export type GenerateBundlerConfigArgs = {
  /** Project root. Defaults to `process.cwd()`. */
  cwd?: string
  /** Overwrite even when the file has been customized (marker removed). */
  force?: boolean
  /** Just verify state without writing — exits non-zero when out of sync. */
  check?: boolean
  /** Suppress logging. */
  quiet?: boolean
}

export type FileResult = {
  filePath: string
  action: 'wrote' | 'kept' | 'skipped-customized' | 'skipped-other-format' | 'would-write' | 'would-overwrite'
  reason?: string
}

export function generateBundlerConfig(args: GenerateBundlerConfigArgs = {}): {
  results: FileResult[]
  ok: boolean
} {
  const cwd = path.resolve(args.cwd ?? process.cwd())
  const force = !!args.force
  const check = !!args.check
  const quiet = !!args.quiet

  const log = (msg: string) => {
    if (!quiet) console.info(msg)
  }
  const warn = (msg: string) => {
    if (!quiet) console.warn(msg)
  }

  const results: FileResult[] = []

  for (const file of FILES) {
    const filePath = path.join(cwd, file.name)

    // detect conflicting other-extension variants the user might be using
    const conflict = file.conflicting.find((alt) => existsSync(path.join(cwd, alt)))
    if (conflict && !existsSync(filePath)) {
      results.push({
        filePath: path.join(cwd, conflict),
        action: 'skipped-other-format',
        reason: `Found ${conflict}; not creating ${file.name}. To switch, delete ${conflict} and re-run with --force.`,
      })
      warn(
        colors.yellow(
          `[one] found ${conflict} — leaving it alone. Delete it and re-run with --force to switch to ${file.name}.`
        )
      )
      continue
    }

    if (!existsSync(filePath)) {
      if (check) {
        results.push({ filePath, action: 'would-write' })
        log(colors.yellow(`[one] missing: ${file.name}`))
        continue
      }
      writeFileSync(filePath, file.content)
      results.push({ filePath, action: 'wrote' })
      log(colors.green(`[one] wrote ${file.name}`))
      continue
    }

    const existing = readFileSync(filePath, 'utf8')

    if (existing === file.content) {
      results.push({ filePath, action: 'kept' })
      log(colors.dim(`[one] up to date: ${file.name}`))
      continue
    }

    const hasMarker = existing.includes(ONE_GENERATED_MARKER)

    if (!hasMarker && !force) {
      results.push({
        filePath,
        action: 'skipped-customized',
        reason: `${file.name} has been customized (no @one marker). Re-add the marker comment or pass --force to overwrite.`,
      })
      warn(
        colors.yellow(
          `[one] ${file.name} appears customized — skipping. Pass --force to overwrite.`
        )
      )
      continue
    }

    if (check) {
      results.push({ filePath, action: 'would-overwrite' })
      log(colors.yellow(`[one] out of date: ${file.name}`))
      continue
    }

    writeFileSync(filePath, file.content)
    results.push({ filePath, action: 'wrote' })
    log(colors.green(`[one] updated ${file.name}`))
  }

  // "ok" means the on-disk state is something we can live with — either we
  // wrote what we wanted, the existing file is up to date, or the user has
  // explicitly customized (their intent, not our problem).
  // check mode is stricter: missing/stale files mean a regen is needed.
  const acceptableAlways = new Set<FileResult['action']>([
    'wrote',
    'kept',
    'skipped-other-format',
    'skipped-customized',
  ])
  const acceptableInCheck = new Set<FileResult['action']>([
    'kept',
    'skipped-other-format',
    'skipped-customized',
  ])
  const ok = (check ? acceptableInCheck : acceptableAlways).size
    ? results.every((r) =>
        (check ? acceptableInCheck : acceptableAlways).has(r.action)
      )
    : false

  return { results, ok }
}

/**
 * True when running on a CI/EAS worker. We only auto-generate bundler-config
 * files in CI so they never appear in a developer's local working tree.
 *
 * Set `CI=1` (or `EAS_BUILD=true`) ahead of `eas update` if you need to
 * publish from a local machine.
 */
export function isCiEnvironment(): boolean {
  return process.env.EAS_BUILD === 'true' || process.env.CI === 'true'
}

import nodeModule from 'node:module'

/**
 * Postinstall hook: when expo-updates is in deps AND we're running on
 * a CI/EAS worker, ensure the bundler-config files exist so the
 * subsequent `expo export` / EXUpdates Metro pass succeeds.
 *
 * No-op locally so the files never show up in a developer's working tree.
 */
export function maybeGenerateBundlerConfigOnInstall(cwd: string = process.cwd()): void {
  if (!isCiEnvironment()) return

  // detect expo-updates via the project's own resolver — same check used
  // by the vxrn expo-plugin and one prebuild
  try {
    nodeModule
      .createRequire(cwd + '/')
      .resolve('expo-updates/package.json')
  } catch {
    return
  }

  generateBundlerConfig({ cwd, quiet: false })
}
