import { existsSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import FSExtra from 'fs-extra'

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export const GENERATED_CLOUDFLARE_WRANGLER_RULES: JsonValue[] = [
  { type: 'ESModule', globs: ['./server/**/*.js'], fallthrough: true },
  { type: 'ESModule', globs: ['./api/**/*.js'], fallthrough: true },
  { type: 'ESModule', globs: ['./middlewares/**/*.js'], fallthrough: true },
  { type: 'ESModule', globs: ['./assets/**/*.js'], fallthrough: true },
]

export function isPlainObject(value: unknown): value is Record<string, JsonValue> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function mergeJsonObjects(
  base: Record<string, JsonValue>,
  overrides: Record<string, JsonValue>
): Record<string, JsonValue> {
  const merged: Record<string, JsonValue> = { ...base }

  for (const [key, value] of Object.entries(overrides)) {
    const baseValue = merged[key]
    if (isPlainObject(baseValue) && isPlainObject(value)) {
      merged[key] = mergeJsonObjects(baseValue, value)
    } else {
      merged[key] = value
    }
  }

  return merged
}

function dedupeJsonValues<T extends JsonValue>(values: T[]): T[] {
  const seen = new Set<string>()
  return values.filter((value) => {
    const key = JSON.stringify(value)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function mergeCloudflareCompatibilityFlags(flags: unknown): string[] {
  const userFlags = Array.isArray(flags)
    ? flags.filter((flag): flag is string => typeof flag === 'string')
    : []

  return dedupeJsonValues<string>(['nodejs_compat', ...userFlags])
}

function mergeCloudflareRules(rules: unknown): JsonValue[] {
  const userRules = Array.isArray(rules)
    ? rules.filter((rule): rule is JsonValue => isPlainObject(rule))
    : []

  return dedupeJsonValues<JsonValue>([
    ...GENERATED_CLOUDFLARE_WRANGLER_RULES,
    ...userRules,
  ])
}

// minimal JSONC parser: strips line/block comments (string-aware) and trailing
// commas, then runs JSON.parse. sufficient for small hand-written config files.
function parseJsonc(text: string): unknown {
  let out = ''
  let i = 0
  let inString = false
  let quote = ''
  while (i < text.length) {
    const ch = text[i]
    const next = text[i + 1]
    if (inString) {
      if (ch === '\\') {
        out += ch + (next ?? '')
        i += 2
        continue
      }
      if (ch === quote) inString = false
      out += ch
      i++
      continue
    }
    if (ch === '"' || ch === "'") {
      inString = true
      quote = ch
      out += ch
      i++
      continue
    }
    if (ch === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') i++
      continue
    }
    if (ch === '/' && next === '*') {
      i += 2
      while (i < text.length - 1 && !(text[i] === '*' && text[i + 1] === '/')) i++
      i += 2
      continue
    }
    out += ch
    i++
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1'))
}

const WRANGLER_FILE_NAMES = ['wrangler.jsonc', 'wrangler.json'] as const

function wranglerCandidateRoots(root: string): string[] {
  return [...new Set([root, process.cwd()])]
}

export function hasUserWranglerConfig(root: string): boolean {
  for (const candidateRoot of wranglerCandidateRoots(root)) {
    for (const fileName of WRANGLER_FILE_NAMES) {
      if (existsSync(join(candidateRoot, fileName))) return true
    }
  }
  return false
}

function parseUserWranglerFile(configPath: string): {
  path: string
  config: Record<string, JsonValue>
} {
  const contents = readFileSync(configPath, 'utf-8')
  let parsed: unknown
  try {
    parsed = parseJsonc(contents)
  } catch (err) {
    throw new Error(
      `Failed to parse ${relative(process.cwd(), configPath)}: ${(err as Error).message}`
    )
  }

  if (!isPlainObject(parsed)) {
    throw new Error(
      `Expected ${relative(process.cwd(), configPath)} to contain a top-level JSON object`
    )
  }

  return {
    path: configPath,
    config: parsed,
  }
}

export function loadUserWranglerConfigSync(
  root: string
): { path: string; config: Record<string, JsonValue> } | null {
  for (const candidateRoot of wranglerCandidateRoots(root)) {
    for (const fileName of WRANGLER_FILE_NAMES) {
      const configPath = join(candidateRoot, fileName)
      if (!existsSync(configPath)) continue
      return parseUserWranglerFile(configPath)
    }
  }
  return null
}

export async function loadUserWranglerConfig(
  root: string
): Promise<{ path: string; config: Record<string, JsonValue> } | null> {
  const candidateRoots = wranglerCandidateRoots(root)

  for (const candidateRoot of candidateRoots) {
    for (const fileName of WRANGLER_FILE_NAMES) {
      const configPath = join(candidateRoot, fileName)
      if (!(await FSExtra.pathExists(configPath))) {
        continue
      }
      return parseUserWranglerFile(configPath)
    }
  }

  return null
}

export function createCloudflareWranglerConfig(
  projectName: string,
  userConfig?: Record<string, JsonValue>
): Record<string, JsonValue> {
  const generatedConfig: Record<string, JsonValue> = {
    name: projectName,
    main: 'worker.js',
    compatibility_date: '2024-12-05',
    compatibility_flags: ['nodejs_compat'],
    find_additional_modules: true,
    rules: GENERATED_CLOUDFLARE_WRANGLER_RULES,
    assets: {
      directory: 'client',
      binding: 'ASSETS',
      run_worker_first: true,
    },
  }

  const mergedConfig = userConfig
    ? mergeJsonObjects(generatedConfig, userConfig)
    : generatedConfig

  mergedConfig.main = 'worker.js'
  mergedConfig.find_additional_modules = true
  mergedConfig.compatibility_flags = mergeCloudflareCompatibilityFlags(
    mergedConfig.compatibility_flags
  )
  mergedConfig.rules = mergeCloudflareRules(mergedConfig.rules)
  mergedConfig.assets = {
    ...(isPlainObject(mergedConfig.assets) ? mergedConfig.assets : {}),
    directory: 'client',
    binding: 'ASSETS',
    run_worker_first: true,
  }

  return mergedConfig
}

export function getCloudflareProjectNameSync(root: string): string {
  try {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'))
    if (pkg.name) {
      return String(pkg.name).replace(/^@[^/]+\//, '')
    }
  } catch {}
  return 'one-app'
}

export async function getCloudflareProjectName(root: string): Promise<string> {
  try {
    const pkg = JSON.parse(await FSExtra.readFile(join(root, 'package.json'), 'utf-8'))
    if (pkg.name) {
      return pkg.name.replace(/^@[^/]+\//, '')
    }
  } catch {}
  return 'one-app'
}

export function isExperimentalWorkerDevEnabled(): boolean {
  return process.env.ONE_EXPERIMENTAL_WORKER_DEV === '1'
}

export function shouldEnableWorkerdDev(deploy: unknown, root: string): boolean {
  if (!isExperimentalWorkerDevEnabled()) return false
  const target =
    typeof deploy === 'string'
      ? deploy
      : (deploy as { target?: string } | undefined)?.target
  if (target === 'cloudflare') return true
  return hasUserWranglerConfig(root)
}
