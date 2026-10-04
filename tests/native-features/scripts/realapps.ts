import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  statSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { parseArgs } from 'node:util'

// installed apps live outside the monorepo so bun cannot reuse its workspace graph.
const repo = resolve(import.meta.dirname, '../../..')
const require = createRequire(join(repo, 'package.json'))
const { parse } = require('@babel/parser')
const { values } = parseArgs({
  options: {
    apps: { type: 'string', default: 'one-basic,takeout-free,contrast-mobile' },
    phase: { type: 'string', default: 'all' },
    version: { type: 'string' },
    'run-dir': { type: 'string' },
    contrast: { type: 'string', default: join(homedir(), 'contrast') },
    'ios-sim': { type: 'string' },
    android: { type: 'string' },
    port: { type: 'string', default: '8097' },
    report: { type: 'string' },
    help: { type: 'boolean' },
  },
  strict: true,
})
if (values.help) {
  console.log(`bun tests/native-features/scripts/realapps.ts [--apps one-basic,takeout-free,contrast-mobile,testflight]
  [--phase inventory|install|web|web-runtime|ios|android|all] [--version <exact beta>]
  [--run-dir <saved run>] [--ios-sim <claimed iOS 27 UDID>] [--android <emulator serial>]
  [--contrast <checkout>] [--port 8097] [--report <markdown>]

Every command and its output is retained. A new run uses fresh app sources and node_modules.
Native devices must already be booted; the runner claims/releases iOS through sim-claim.
API coverage is reported separately and unexercised imports fail the complete matrix.`)
  process.exit(0)
}
const phases = ['inventory', 'install', 'web', 'web-runtime', 'ios', 'android', 'all']
if (!phases.includes(values.phase!)) throw new Error(`Unknown phase ${values.phase}`)
const runDir = values['run-dir']
  ? resolve(values['run-dir'])
  : mkdtempSync(join(tmpdir(), 'one-realapps-'))
mkdirSync(runDir, { recursive: true })
const statePath = join(runDir, 'matrix.json')
type Step = { status: 'pass' | 'fail'; log: string; seconds: number; error?: string }
type Inventory = { packages: Record<string, string[]>; apis: Record<string, string[]> }
type AppResult = {
  source: string
  revision: string
  cwd?: string
  inventory: Inventory
  steps: Record<string, Step>
  exercised: Record<string, string[]>
}
type State = {
  started: string
  version: string
  oneRevision: string
  apps: Record<string, AppResult>
}
const command = (argv: string[], cwd = repo) => {
  const result = spawnSync(argv[0], argv.slice(1), { cwd, encoding: 'utf8' })
  if (result.status !== 0)
    throw new Error(`${argv.join(' ')}\n${result.stdout}${result.stderr}`)
  return result.stdout.trim()
}
const state: State = existsSync(statePath)
  ? JSON.parse(readFileSync(statePath, 'utf8'))
  : {
      started: new Date().toISOString(),
      version: values.version ?? command(['npm', 'view', 'one@beta', 'version']),
      oneRevision: command(['git', 'rev-parse', 'HEAD']),
      apps: {},
    }
if (values.version && state.version !== values.version)
  throw new Error('A saved run cannot change its One version')
if (!/^2\.0\.0-(beta\.|0\.canary\.)/.test(state.version))
  throw new Error(`Expected an exact One beta/canary, got ${state.version}`)
const reportPath = resolve(values.report ?? join(runDir, 'matrix.md'))
const appNames = values.apps!.split(',')
const save = () => {
  const latest: State | undefined = existsSync(statePath)
    ? JSON.parse(readFileSync(statePath, 'utf8'))
    : undefined
  state.apps = {
    ...latest?.apps,
    ...Object.fromEntries(
      appNames.filter((name) => state.apps[name]).map((name) => [name, state.apps[name]])
    ),
  }
  writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n')
}
const heavy = join(values.contrast!, 'scripts/heavy.sh')
if (!existsSync(heavy) && values.phase !== 'inventory')
  throw new Error(`Missing build admission wrapper: ${heavy}`)
const appSources: Record<string, string> = {
  'one-basic': join(repo, 'examples/one-basic'),
  testflight: join(repo, 'examples/testflight'),
  'contrast-mobile': join(values.contrast!, 'templates/contrast-mobile'),
  'takeout-free': join(runDir, 'sources/takeout-free'),
}
const ignored = new Set([
  'node_modules',
  'ios',
  'android',
  'dist',
  'build',
  '.git',
  '.one',
  '.tamagui',
  '.expo',
])
const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (ignored.has(entry.name)) return []
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.[cm]?[jt]sx?$/.test(entry.name) &&
      !/\.(test|spec|d)\.[cm]?[jt]sx?$/.test(entry.name)
      ? [path]
      : []
  })
function inventory(root: string): Inventory {
  const result: Inventory = { packages: {}, apis: {} }
  const { loadConfig, createMatchPath } = require('tsconfig-paths')
  const config = loadConfig(root)
  if (config.resultType !== 'success') throw new Error(config.message)
  const matchPath = createMatchPath(config.absoluteBaseUrl, config.paths)
  const workspace = root.includes('/templates/') ? resolve(root, '../..') : root
  const queue = sourceFiles(root)
  const visited = new Set<string>()
  for (let i = 0; i < queue.length; i++) {
    const file = queue[i]!
    if (visited.has(file)) continue
    visited.add(file)
    const follow = (name: string) => {
      let found: string | undefined
      const extensions = ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs']
      if (name.startsWith('.')) {
        const base = resolve(dirname(file), name)
        found = [
          base,
          ...extensions.map((ext) => base + ext),
          ...extensions.map((ext) => join(base, 'index' + ext)),
        ].find((path) => existsSync(path) && statSync(path).isFile())
      } else {
        found = matchPath(name, undefined, existsSync, extensions)
        if (found && !existsSync(found))
          found = extensions.map((ext) => found + ext).find(existsSync)
        if (!found) {
          try {
            found = createRequire(file).resolve(name)
          } catch {}
        }
      }
      if (
        !found ||
        !found.startsWith('/') ||
        found.endsWith('.d.ts') ||
        !/\.[cm]?[jt]sx?$/.test(found)
      )
        return
      if (statSync(found).isDirectory()) {
        found = extensions.map((ext) => join(found!, 'index' + ext)).find(existsSync)
        if (!found) return
      }
      const target = realpathSync(found)
      if (!target.startsWith(workspace + '/') || target.includes('/node_modules/')) return
      queue.push(target)
      const base = target.replace(/(?:\.(?:native|ios|android|web))?\.[cm]?[jt]sx?$/, '')
      for (const platform of ['native', 'ios', 'android', 'web'])
        for (const ext of ['tsx', 'ts', 'jsx', 'js']) {
          const sibling = `${base}.${platform}.${ext}`
          if (existsSync(sibling)) queue.push(sibling)
        }
    }
    const source = readFileSync(file, 'utf8')
    const ast = parse(source, {
      sourceType: 'unambiguous',
      plugins: ['typescript', 'jsx'],
    })
    const aliases = new Set<string>()
    const note = (map: Record<string, string[]>, key: string, line: number) => {
      const location = `${relative(root, file)}:${line}`
      const files = (map[key] ??= [])
      if (!files.includes(location)) files.push(location)
    }
    const nativePackage = (name: string) =>
      /^(?:expo(?:-|\/|$)|@expo\/|react-native-|@react-native(?:-community)?\/|@shopify\/react-native-|@react-navigation\/|@callstack\/liquid-glass)/.test(
        name
      )
    const visit = (node: any) => {
      if (!node || typeof node !== 'object') return
      if (
        (node.type === 'ExportNamedDeclaration' ||
          node.type === 'ExportAllDeclaration') &&
        node.source &&
        node.exportKind !== 'type'
      )
        follow(node.source.value)
      if (node.type === 'ImportDeclaration' && node.importKind !== 'type') {
        const name = node.source.value
        follow(name)
        if (nativePackage(name)) note(result.packages, name, node.loc.start.line)
        if (name === 'one') {
          for (const specifier of node.specifiers) {
            if (specifier.importKind === 'type') continue
            if (specifier.imported?.name === 'One') aliases.add(specifier.local.name)
            if (
              /^(useSafeAreaInsets|useSizeClass|useHeaderHeight|useHinge|useFonts|useNetworkState)$/.test(
                specifier.imported?.name ?? ''
              )
            )
              note(result.apis, specifier.imported.name, node.loc.start.line)
          }
        }
      }
      if (
        (node.type === 'CallExpression' && node.callee.type === 'Import') ||
        (node.type === 'CallExpression' && node.callee.name === 'require')
      ) {
        const name = node.arguments[0]?.value
        if (typeof name === 'string') {
          follow(name)
          if (nativePackage(name)) note(result.packages, name, node.loc.start.line)
        }
      }
      if (node.type === 'MemberExpression' || node.type === 'JSXMemberExpression') {
        const parts: string[] = []
        let member = node
        while (
          member?.type === 'MemberExpression' ||
          member?.type === 'JSXMemberExpression'
        ) {
          if (member.computed) break
          parts.unshift(member.property.name)
          member = member.object
        }
        if (aliases.has(member?.name) && parts.length) {
          // group methods under their owning API while retaining exact call locations.
          const count = ['UI', 'iOS', 'Android', 'Auth'].includes(parts[0]) ? 2 : 1
          if (parts.length >= count)
            note(
              result.apis,
              `One.${parts.slice(0, count).join('.')}`,
              node.loc.start.line
            )
        }
      }
      for (const [key, child] of Object.entries(node)) {
        if (['loc', 'start', 'end', 'comments', 'tokens'].includes(key)) continue
        if (Array.isArray(child)) child.forEach(visit)
        else if (child && typeof child === 'object') visit(child)
      }
    }
    visit(ast.program)
  }
  return result
}
function step(
  name: string,
  app: AppResult,
  key: string,
  argv: string[],
  cwd: string,
  build = false
): boolean {
  const output = join(runDir, name, `${key}.log`)
  mkdirSync(dirname(output), { recursive: true })
  const started = performance.now()
  const actual = build ? ['bash', heavy, '--cores', '4', '--', ...argv] : argv
  const process = spawnSync(actual[0], actual.slice(1), {
    cwd,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    timeout: 40 * 60 * 1000,
    env: {
      ...globalThis.process.env,
      CI: '1',
      RCT_METRO_PORT: values.port!,
      ANDROID_SERIAL: values.android,
    },
  })
  const outputText = `${process.stdout ?? ''}${process.stderr ?? ''}${process.error ? String(process.error) : ''}`
  writeFileSync(output, `$ ${actual.join(' ')}\nCWD: ${cwd}\n${outputText}`)
  // xcodebuildmcp reports tool errors in text even when its CLI exits zero.
  const failed =
    process.status !== 0 ||
    /(?:"(?:isError|didError)":\s*true|❌|Error:|BUILD FAILED)/.test(outputText)
  app.steps[key] = {
    status: failed ? 'fail' : 'pass',
    log: relative(runDir, output),
    seconds: (performance.now() - started) / 1000,
    ...(failed ? { error: outputText.slice(-5000) } : {}),
  }
  save()
  console.log(
    `${name} ${key}: ${app.steps[key].status} (${app.steps[key].seconds.toFixed(1)}s); ${output}`
  )
  return !failed
}
async function web(name: string, app: AppResult) {
  if (
    values.phase !== 'web-runtime' &&
    !step(
      name,
      app,
      'web-build',
      ['bunx', '--no-install', 'one', 'build'],
      app.cwd!,
      true
    )
  )
    return
  const log = Bun.file(join(runDir, name, 'web-server.log'))
  const server = Bun.spawn(
    ['bunx', '--no-install', 'one', 'serve', '--port', values.port!],
    { cwd: app.cwd!, stdout: log, stderr: log, env: { ...process.env } }
  )
  const started = performance.now()
  try {
    const { chromium } = require('playwright')
    const browser = await chromium.launch({ headless: true })
    try {
      const page = await browser.newPage()
      const errors: string[] = []
      page.on('pageerror', (error: Error) => errors.push(error.message))
      // wait on the server's output stream, not a fixed startup delay.
      const ready = Bun.spawn(
        [
          'bun',
          join(import.meta.dirname, 'realapps-web-ready.ts'),
          `http://localhost:${values.port}`,
          join(runDir, name, 'web-server.log'),
        ],
        { stdout: 'pipe', stderr: 'pipe' }
      )
      const [readyOutput, readyError] = await Promise.all([
        new Response(ready.stdout).text(),
        new Response(ready.stderr).text(),
      ])
      if (await ready.exited) throw new Error(readyOutput + readyError)
      const routes =
        name === 'one-basic'
          ? [
              ['/', 'Hello world, from One'],
              ['/tabs', 'Home Tab'],
              ['/tabs/profile', 'Profile Tab'],
              ['/tabs/settings', 'Settings Tab'],
            ]
          : [['/', null]]
      for (const [route, text] of routes) {
        const response = await page.goto(`http://localhost:${values.port}${route}`, {
          waitUntil: 'networkidle',
        })
        if (!response?.ok()) throw new Error(`${route}: HTTP ${response?.status()}`)
        if (text)
          await page.getByText(text, { exact: true }).waitFor({ state: 'visible' })
        else if (!(await page.locator('body').innerText()).trim())
          throw new Error('Empty rendered body')
        await page.screenshot({
          path: join(runDir, name, `web-${route!.replaceAll('/', '_')}.png`),
        })
      }
      if (errors.length) throw new Error(errors.join('\n'))
      app.steps['web-runtime'] = {
        status: 'pass',
        log: `${name}/web-server.log`,
        seconds: (performance.now() - started) / 1000,
      }
    } finally {
      await browser.close()
    }
  } catch (error) {
    app.steps['web-runtime'] = {
      status: 'fail',
      log: `${name}/web-server.log`,
      seconds: (performance.now() - started) / 1000,
      error: String(error),
    }
  } finally {
    server.kill()
    await server.exited
    save()
  }
}
function writeReport() {
  const cell = (app: AppResult, key: string) =>
    app.steps[key]
      ? `[${app.steps[key].status.toUpperCase()}](${join(runDir, app.steps[key].log)})`
      : 'NOT RUN'
  const lines = [
    '# One native real-app matrix',
    '',
    `RAN: One ${state.version}; One checkout ${state.oneRevision}; started ${state.started}.`,
    '',
    `Saved run: \`${runDir}\`. Full output and machine-readable state: [matrix.json](${statePath}).`,
    '',
    '| app | clean install | web build | web runtime | iOS build/run | Android build/run | API coverage |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ]
  for (const [name, app] of Object.entries(state.apps)) {
    const uncovered = Object.keys(app.inventory.apis).filter(
      (api) => !app.exercised[api]?.length
    )
    lines.push(
      `| ${name} | ${cell(app, 'install')} | ${cell(app, 'web-build')} | ${cell(app, 'web-runtime')} | ${cell(app, 'ios-runtime')} | ${cell(app, 'android-runtime')} | ${uncovered.length ? `NOT RUN (${uncovered.length} APIs)` : 'no native API imports'} |`
    )
  }
  lines.push('', '## sources and native APIs', '')
  for (const [name, app] of Object.entries(state.apps)) {
    lines.push(
      `### ${name}`,
      '',
      `Source: \`${app.source}\`, revision \`${app.revision}\`.`,
      '',
      '| imported API | source locations | exercised evidence |',
      '| --- | --- | --- |'
    )
    for (const [api, files] of Object.entries(app.inventory.apis).sort())
      lines.push(
        `| ${api} | ${files.map((file) => `\`${file}\``).join(', ')} | ${app.exercised[api]?.join(', ') ?? 'NOT RUN'} |`
      )
  }
  lines.push(
    '',
    '## per-platform packages still imported',
    '',
    'RAN: parsed application source imports, excluding comments, type-only imports, tests and generated declarations. The inventory follows source imports into shared workspace code and includes platform variants; external package internals are excluded.',
    '',
    '| app | package/subpath | importing files |',
    '| --- | --- | --- |'
  )
  for (const [name, app] of Object.entries(state.apps))
    for (const [pkg, files] of Object.entries(app.inventory.packages).sort())
      lines.push(
        `| ${name} | ${pkg} | ${files.map((file) => `\`${file}\``).join(', ')} |`
      )
  lines.push('', '## failure output', '')
  for (const [name, app] of Object.entries(state.apps))
    for (const [key, result] of Object.entries(app.steps))
      if (result.status === 'fail')
        lines.push(
          `### ${name}: ${key}`,
          '',
          `[complete output](${join(runDir, result.log)})`,
          '',
          '```text',
          result.error ?? '',
          '```',
          ''
        )
  lines.push(
    '## rerun',
    '',
    '```sh',
    `bun tests/native-features/scripts/realapps.ts --version ${state.version} --ios-sim <iOS-27-UDID> --android <serial>`,
    '```',
    '',
    'Use --phase inventory for the dependency/API list, or --phase web/ios/android for one platform. --run-dir resumes the same clean install for diagnosis; omit it for a new install. API coverage requires named evidence for every imported API on every applicable platform. Build success and HTTP success alone do not satisfy runtime coverage.',
    '',
    'Android Pager return/draft and composer/IME proofs belong to p56058 (lane r54227); this runner does not duplicate those proofs.',
    ''
  )
  mkdirSync(dirname(reportPath), { recursive: true })
  writeFileSync(reportPath, lines.join('\n'))
}

for (const name of appNames) {
  if (!appSources[name]) throw new Error(`Unknown app ${name}`)
  const source = appSources[name]
  if (name === 'takeout-free' && !existsSync(source)) {
    mkdirSync(dirname(source), { recursive: true })
    command([
      'git',
      'clone',
      '--depth',
      '1',
      'https://github.com/tamagui/takeout-free.git',
      source,
    ])
  }
  const revision = command(['git', 'rev-parse', 'HEAD'], source)
  const app = (state.apps[name] ??= {
    source,
    revision,
    inventory: inventory(source),
    steps: {},
    exercised: {},
  })
  if (values.phase === 'inventory') {
    app.inventory = inventory(app.cwd ?? source)
    save()
    continue
  }
  if (!app.cwd) {
    const target = join(runDir, 'apps', name)
    if (name === 'contrast-mobile') {
      const worktree = join(
        homedir(),
        '.worktrees',
        `contrast-realapps-${basename(runDir)}`
      )
      command(['git', 'fetch', 'origin'], values.contrast!)
      command(
        [
          'tm',
          'worktree',
          'add',
          `realapps-${basename(runDir)}`,
          '--project',
          values.contrast!,
          '--base',
          'origin/main',
          '--detach',
          '--no-hydrate',
        ],
        values.contrast!
      )
      Bun.spawn(
        ['bash', join(homedir(), 'team-machine/scripts/check-worktree-staleness.sh')],
        { stdout: 'ignore', stderr: 'ignore' }
      ).unref()
      const manifest = join(worktree, 'package.json')
      const json = JSON.parse(readFileSync(manifest, 'utf8'))
      for (const name of Object.keys(json.catalog))
        if (name === 'one' || name === 'vxrn' || name.startsWith('@vxrn/'))
          json.catalog[name] = state.version
      writeFileSync(manifest, JSON.stringify(json, null, 2) + '\n')
      app.cwd = join(worktree, 'templates/contrast-mobile')
      app.revision = command(['git', 'rev-parse', 'HEAD'], worktree)
      app.inventory = inventory(app.cwd)
    } else {
      cpSync(source, target, {
        recursive: true,
        filter: (path) => !ignored.has(basename(path)),
      })
      const manifest = join(target, 'package.json')
      const json = JSON.parse(readFileSync(manifest, 'utf8'))
      for (const group of ['dependencies', 'devDependencies', 'resolutions'])
        for (const [pkg, version] of Object.entries(json[group] ?? {})) {
          if (typeof version === 'string' && version.startsWith('workspace:'))
            json[group][pkg] = state.version
        }
      json.dependencies.one = state.version
      writeFileSync(manifest, JSON.stringify(json, null, 2) + '\n')
      if (existsSync(join(target, '.env.example')))
        cpSync(join(target, '.env.example'), join(target, '.env'))
      app.cwd = target
    }
    save()
  }
  if (app.steps.install?.status !== 'pass') {
    const installRoot = name === 'contrast-mobile' ? resolve(app.cwd!, '../..') : app.cwd!
    if (!step(name, app, 'install', ['bun', 'install'], installRoot)) continue
  }
  {
    const artifactPath = createRequire(join(app.cwd!, 'package.json')).resolve(
      'one/package.json'
    )
    const installed = JSON.parse(readFileSync(artifactPath, 'utf8'))
    if (installed.version !== state.version)
      throw new Error(`Resolved One ${installed.version}, expected ${state.version}`)
    writeFileSync(
      join(runDir, name, 'one-artifact.json'),
      JSON.stringify(
        {
          version: installed.version,
          releaseSourceCommit: installed.releaseSourceCommit,
          packagePath: artifactPath,
        },
        null,
        2
      )
    )
  }
  step(
    name,
    app,
    'navigation-versions',
    ['bun', join(import.meta.dirname, 'realapps-navigation.ts'), app.cwd!],
    app.cwd!
  )
  if (values.phase === 'install') continue
  if (['all', 'web', 'web-runtime'].includes(values.phase!)) await web(name, app)
  for (const platform of ['ios', 'android']) {
    if (values.phase !== 'all' && values.phase !== platform) continue
    const device = platform === 'ios' ? values['ios-sim'] : values.android
    if (!device) {
      app.steps[`${platform}-runtime`] = {
        status: 'fail',
        log: `${name}/${platform}-preflight.log`,
        seconds: 0,
        error: `Missing explicit ${platform} device`,
      }
      writeFileSync(
        join(runDir, name, `${platform}-preflight.log`),
        app.steps[`${platform}-runtime`].error!
      )
      continue
    }
    if (platform === 'ios')
      command([
        'bash',
        join(homedir(), 'team-machine/scripts/sim-claim.sh'),
        'claim',
        device,
        '--metro',
        values.port!,
      ])
    try {
      if (
        !step(
          name,
          app,
          'native-instrumentation',
          [
            'bun',
            join(import.meta.dirname, 'realapps-inject.ts'),
            app.cwd!,
            values.port!,
          ],
          app.cwd!
        )
      )
        continue
      if (
        !step(
          name,
          app,
          `${platform}-prebuild`,
          ['bunx', '--no-install', 'one', 'prebuild', '--platform', platform],
          app.cwd!,
          true
        )
      )
        continue
      const devLog = Bun.file(join(runDir, name, `${platform}-dev-server.log`))
      const dev = Bun.spawn(
        ['bunx', '--no-install', 'one', 'dev', '--port', values.port!],
        { cwd: app.cwd!, stdout: devLog, stderr: devLog, env: { ...process.env } }
      )
      try {
        if (
          !step(
            name,
            app,
            `${platform}-server-ready`,
            [
              'bun',
              join(import.meta.dirname, 'realapps-web-ready.ts'),
              `http://localhost:${values.port}/status`,
              join(runDir, name, `${platform}-dev-server.log`),
            ],
            app.cwd!
          )
        )
          continue
        if (!step(name, app, `${platform}-bundle-ready`, [
          'bun', join(import.meta.dirname, 'realapps-web-ready.ts'),
          `http://localhost:${values.port}/index.bundle?platform=${platform}&dev=true`,
          join(runDir, name, `${platform}-dev-server.log`),
        ], app.cwd!)) continue
        const ok =
          platform === 'ios'
            ? step(
                name,
                app,
                'ios-build',
                ['bunx', '--no-install', 'one', 'run:ios', '--udid', device],
                app.cwd!,
                true
              )
            : step(
                name,
                app,
                'android-build',
                ['bunx', '--no-install', 'one', 'run:android'],
                app.cwd!,
                true
              )
        if (!ok) continue
        const text =
          name === 'one-basic'
            ? 'Hello world, from One'
            : name === 'contrast-mobile'
              ? 'Skip'
              : name === 'testflight'
                ? 'Native'
                : 'Welcome'
        const runtime = step(
          name,
          app,
          `${platform}-runtime`,
          [
            'bun',
            join(import.meta.dirname, 'realapps-native-ui.ts'),
            '--platform',
            platform,
            '--device',
            device,
            '--package-root',
            app.cwd!,
            '--text',
            text,
            '--out',
            join(runDir, name, `${platform}-home`),
          ],
          app.cwd!
        )
        if (runtime && name === 'one-basic')
          step(
            name,
            app,
            `${platform}-routing`,
            [
              'bun',
              join(import.meta.dirname, 'realapps-native-ui.ts'),
              '--platform',
              platform,
              '--device',
              device,
              '--package-root',
              app.cwd!,
              '--mode',
              'routing',
              '--out',
              join(runDir, name, `${platform}-routing`),
            ],
            app.cwd!
          )
      } finally {
        dev.kill()
        await dev.exited
      }
    } finally {
      if (platform === 'ios')
        command([
          'bash',
          join(homedir(), 'team-machine/scripts/sim-claim.sh'),
          'release',
          device,
        ])
    }
  }
  save()
  writeReport()
}
save()
writeReport()
console.log(`Report: ${reportPath}\nSaved run: ${runDir}`)
if (
  values.phase !== 'inventory' &&
  Object.values(state.apps).some(
    (app) =>
      Object.values(app.steps).some((step) => step.status === 'fail') ||
      Object.keys(app.inventory.apis).some((api) => !app.exercised[api]?.length)
  )
)
  process.exitCode = 1
