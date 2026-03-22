import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

// patterns that should never appear in client bundles
const SECRET_PATTERNS: Array<[string, RegExp]> = [
  // api tokens / keys with known prefixes
  ['Anthropic API key', /sk-ant-[A-Za-z0-9_-]{20,}/g],
  ['OpenAI API key', /sk-proj-[A-Za-z0-9_-]{20,}/g],
  ['Stripe secret key', /sk_live_[A-Za-z0-9]{20,}/g],
  ['Stripe webhook secret', /whsec_[A-Za-z0-9]{20,}/g],
  ['GitHub token', /gh[ps]_[A-Za-z0-9]{36,}/g],
  ['GitHub PAT', /github_pat_[A-Za-z0-9_]{20,}/g],
  ['AWS access key', /(?<![A-Za-z0-9])AKIA[0-9A-Z]{16}(?![A-Za-z0-9])/g],
  [
    'Postmark server token',
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g,
  ],
  ['Bearer token assignment', /["']Bearer\s+[A-Za-z0-9_.-]{20,}["']/g],
  [
    'Generic secret assignment',
    /(?:secret|password|api_key|apikey)\s*[:=]\s*["'][A-Za-z0-9_-]{16,}["']/gi,
  ],
  // known env var names that should never be inlined
  ['BETTER_AUTH_SECRET value', /BETTER_AUTH_SECRET["']\s*[:=]\s*["'][^"']+["']/g],
  ['POSTMARK_SERVER_TOKEN value', /POSTMARK_SERVER_TOKEN["']\s*[:=]\s*["'][^"']+["']/g],
  ['ANTHROPIC_API_KEY value', /ANTHROPIC_API_KEY["']\s*[:=]\s*["'][^"']+["']/g],
]

// UUIDs that are known safe (WebRTC SDP constants, zero-uuid, etc.)
const SAFE_UUIDS = new Set([
  '00000000-0000-0000-0000-000000000000',
  '09259e3b-7be8-46f6-9801-106bf1866e1c', // WebRTC SDP
  '4ad15a19-80e2-4105-bf43-48039fd2963e', // WebRTC SDP
])

// known safe matches to ignore (doc examples, CSS tokens, etc.)
const BUILTIN_SAFE_PATTERNS: RegExp[] = [
  /sk_live_your_/,
  /sk_live_your_key/,
  /rk_\w+_\w+/, // tamagui theme tokens
  /sk_all_element/, // DOM property names
  /sk_personal_data/, // analytics property names
]

function createSafeMatcher(userPatterns?: (string | RegExp)[]) {
  const safeStrings = new Set(SAFE_UUIDS)
  const safeRegexes = [...BUILTIN_SAFE_PATTERNS]

  if (userPatterns) {
    for (const p of userPatterns) {
      if (typeof p === 'string') {
        safeStrings.add(p)
      } else {
        safeRegexes.push(p)
      }
    }
  }

  return (match: string): boolean => {
    if (safeStrings.has(match)) return true
    return safeRegexes.some((p) => p.test(match))
  }
}

export type SecurityFinding = {
  file: string
  label: string
  match: string
  line: number
}

// recursively collect all .js files from a directory
async function collectJSFiles(dir: string): Promise<string[]> {
  const files: string[] = []

  async function walk(currentDir: string) {
    let entries
    try {
      entries = await readdir(currentDir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath)
      } else if (entry.name.endsWith('.js')) {
        files.push(fullPath)
      }
    }
  }

  await walk(dir)
  return files
}

export async function scanBundleForSecrets(
  distDir: string,
  userSafePatterns?: (string | RegExp)[]
): Promise<{
  clean: boolean
  findings: SecurityFinding[]
}> {
  const isSafe = createSafeMatcher(userSafePatterns)
  const files = await collectJSFiles(distDir)
  const findings: SecurityFinding[] = []

  for (const fullPath of files) {
    const relativePath = fullPath.slice(distDir.length + 1)
    let content: string
    try {
      content = await readFile(fullPath, 'utf-8')
    } catch {
      continue
    }

    for (const [label, pattern] of SECRET_PATTERNS) {
      // reset regex state
      pattern.lastIndex = 0
      let match: RegExpExecArray | null

      while ((match = pattern.exec(content)) !== null) {
        const matched = match[0]
        if (isSafe(matched)) continue

        // find approximate line number
        const beforeMatch = content.slice(0, match.index)
        const line = (beforeMatch.match(/\n/g)?.length ?? 0) + 1

        findings.push({
          file: relativePath,
          label,
          match:
            matched.length > 40
              ? `${matched.slice(0, 20)}...${matched.slice(-10)}`
              : matched,
          line,
        })
      }
    }
  }

  return { clean: findings.length === 0, findings }
}

/**
 * runs the security scan based on config level
 * returns true if the build should continue, false if it should fail
 */
export async function runSecurityScan(
  clientDir: string,
  level: 'warn' | 'error',
  safePatterns?: (string | RegExp)[]
): Promise<boolean> {
  console.info(`\n 🔒 scanning client bundles for leaked secrets...\n`)

  const { clean, findings } = await scanBundleForSecrets(clientDir, safePatterns)

  if (clean) {
    console.info(`\n 🔒 security scan passed — no secrets found\n`)
    return true
  }

  const icon = level === 'error' ? '🚨' : '⚠️'
  const header =
    level === 'error'
      ? `${icon} ${findings.length} secret(s) leaked into client bundle:`
      : `${icon} ${findings.length} potential secret(s) found in client bundle:`

  console.error(`\n ${header}\n`)

  for (const f of findings) {
    console.error(`   ${f.label}`)
    console.error(`     file: ${f.file}:${f.line}`)
    console.error(`     match: ${f.match}\n`)
  }

  if (level === 'error') {
    console.error(
      ` Set build.securityScan to 'warn' to continue building despite findings.\n`
    )
    return false
  }

  console.warn(
    ` Set build.securityScan to 'error' to fail builds when secrets are detected.\n`
  )
  return true
}
