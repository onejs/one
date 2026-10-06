import { spawnSync } from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, test } from 'vitest'

const fixture = join(import.meta.dirname, '../../../tests/native-features')
let root: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'one-fixture-prebuild-'))
  mkdirSync(join(root, 'scripts'))
  mkdirSync(join(root, 'bin'))
  copyFileSync(join(fixture, 'package.json'), join(root, 'package.json'))
  copyFileSync(
    join(fixture, 'scripts/prebuild-native.ts'),
    join(root, 'scripts/prebuild-native.ts')
  )
  for (const hook of ['audio-interruption', 'background-tasks']) {
    writeFileSync(
      join(root, 'scripts', `prepare-ios-${hook}.ts`),
      `
import { appendFileSync } from 'node:fs'
appendFileSync(process.env.HOOK_FILE!, JSON.stringify('${hook}') + '\\n')
`
    )
  }
  const one = join(root, 'bin', 'one')
  writeFileSync(
    one,
    `#!/usr/bin/env node
import { writeFileSync } from 'node:fs'
writeFileSync(process.env.RECORD_FILE, JSON.stringify(process.argv.slice(2)))
process.exit(Number(process.env.PREBUILD_EXIT_CODE ?? 0))
`
  )
  chmodSync(one, 0o755)
})

afterEach(() => rmSync(root, { recursive: true, force: true }))

function run(args: string[], exitCode = 0) {
  return spawnSync('bun', ['run', 'prebuild:native', ...args], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${join(root, 'bin')}:${process.env.PATH}`,
      RECORD_FILE: join(root, 'args.json'),
      HOOK_FILE: join(root, 'hooks.jsonl'),
      PREBUILD_EXIT_CODE: String(exitCode),
    },
  })
}

function hooks() {
  return readFileSync(join(root, 'hooks.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line))
}

test('Android prebuild forwards CLI options and succeeds without an iOS project', () => {
  const result = run(['--platform', 'android', '--no-install'])
  expect(result.status, result.stderr).toBe(0)
  expect(JSON.parse(readFileSync(join(root, 'args.json'), 'utf8'))).toEqual([
    'prebuild',
    '--platform',
    'android',
    '--no-install',
  ])
  expect(existsSync(join(root, 'ios'))).toBe(false)
  expect(existsSync(join(root, 'hooks.jsonl'))).toBe(false)
})

test('iOS prebuild forwards CLI options and installs both simulator hooks', () => {
  const result = run(['--platform', 'ios', '--no-install'])
  expect(result.status, result.stderr).toBe(0)
  expect(JSON.parse(readFileSync(join(root, 'args.json'), 'utf8'))).toEqual([
    'prebuild',
    '--platform',
    'ios',
    '--no-install',
  ])
  expect(hooks()).toEqual(['audio-interruption', 'background-tasks'])
})

test('a failed prebuild preserves its exit status and leaves simulator hooks untouched', () => {
  const result = run(['--platform', 'ios'], 42)
  expect(result.status, result.stderr).toBe(42)
  expect(existsSync(join(root, 'hooks.jsonl'))).toBe(false)
})

test('prebuilding both platforms still installs the iOS simulator hooks', () => {
  const result = run([])
  expect(result.status, result.stderr).toBe(0)
  expect(hooks()).toEqual(['audio-interruption', 'background-tasks'])
})
