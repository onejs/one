#!/usr/bin/env bun
import { spawn, spawnSync, execFile, execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
  writeSync,
} from 'node:fs'
import { hostname, homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { parseArgs, promisify } from 'node:util'
import { parseLines, report, type Sample } from './report'

export type Phase = { app: string; case: string; run: string | number }

export function captureConsole(
  argv: string[],
  log: string,
  timeout: number,
  stopOnDone: boolean,
  options: {
    env?: NodeJS.ProcessEnv
    onPhase?: (phase: Phase) => Promise<Sample>
    onReady?: () => Promise<void>
    readyText?: string
  } = {}
): Promise<number> {
  return new Promise((resolveCapture, reject) => {
    const fd = openSync(log, 'w')
    const process = spawn(argv[0], argv.slice(1), {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: options.env,
    })
    let terminal: 'DONE' | 'ERROR' | undefined
    let failure: Error | undefined
    let recent = ''
    let ready = false
    let readyWork = Promise.resolve()
    let currentPhase: Phase | undefined
    let phaseWork = Promise.resolve()
    let cleanupTimer: ReturnType<typeof setTimeout> | undefined
    const buffers = { stdout: '', stderr: '' }
    function stop() {
      process.kill('SIGTERM')
      cleanupTimer ??= setTimeout(() => process.kill('SIGKILL'), 5000)
    }
    const timer = setTimeout(() => {
      failure = new Error(`console timed out after ${timeout}s: ${log}`)
      stop()
    }, timeout * 1000)
    function line(value: string) {
      writeSync(fd, value)
      recent = (recent + value).slice(-8192)
      if (!ready && options.onReady && value.includes(options.readyText!)) {
        ready = true
        readyWork = options.onReady().catch((error) => {
          failure = error
          stop()
        })
      }
      if (recent.includes('FBSOpenApplicationErrorDomain') && /\bLocked\b/.test(recent)) {
        failure = new Error(`iOS refused launch because the device is locked; see ${log}`)
        stop()
      }
      const marker = value.match(/(?:^|\s)BENCH_(DONE|ERROR)(?:\s|$)/)
      if (marker && (!terminal || marker[1] === 'ERROR'))
        terminal = marker[1] as 'DONE' | 'ERROR'
      if (terminal === 'ERROR') stop()
      const phaseMarker = value.match(/BENCH_PHASE (\{.*\})/)
      if (phaseMarker || marker?.[1] === 'DONE') {
        phaseWork = phaseWork
          .then(async () => {
            if (failure || terminal === 'ERROR') return
            if (phaseMarker) {
              const phase = JSON.parse(phaseMarker[1])
              if (
                typeof phase.app !== 'string' ||
                typeof phase.case !== 'string' ||
                !['string', 'number'].includes(typeof phase.run)
              )
                throw new Error('invalid BENCH_PHASE')
              currentPhase = phase
            }
            if (currentPhase) {
              if (!options.onPhase)
                throw new Error('host phase footprint requires --simulator')
              const phase = phaseMarker
                ? currentPhase
                : { ...currentPhase, case: 'complete' }
              const sample = await options.onPhase(phase)
              writeSync(fd, `BENCH ${JSON.stringify(sample)}\n`)
            }
            if (marker?.[1] === 'DONE' && stopOnDone) stop()
          })
          .catch((error) => {
            failure = error
            stop()
          })
      }
    }
    for (const stream of ['stdout', 'stderr'] as const) {
      process[stream]!.setEncoding('utf8')
      process[stream]!.on('data', (chunk: string) => {
        buffers[stream] += chunk
        const lines = buffers[stream].split('\n')
        buffers[stream] = lines.pop()!
        for (const value of lines) line(value + '\n')
      })
    }
    process.on('error', (error) => {
      failure = error
    })
    process.on('close', async (code) => {
      for (const pending of Object.values(buffers)) if (pending) line(pending)
      await phaseWork
      await readyWork
      clearTimeout(timer)
      if (cleanupTimer) clearTimeout(cleanupTimer)
      closeSync(fd)
      if (failure) reject(failure)
      else
        resolveCapture(
          terminal === 'ERROR' ? 1 : terminal === 'DONE' && stopOnDone ? 0 : (code ?? 1)
        )
    })
  })
}

function command(argv: string[], timeout = 120_000): string {
  return execFileSync(argv[0], argv.slice(1), { encoding: 'utf8', timeout })
}

export async function hostFootprint(
  simulator: string,
  bundle: string,
  app: string,
  engine: string,
  phase: Phase,
  rawPath: string
): Promise<Sample> {
  const container = command([
    'xcrun',
    'simctl',
    'get_app_container',
    simulator,
    bundle,
    'app',
  ]).trim()
  const binary = command([
    '/usr/libexec/PlistBuddy',
    '-c',
    'Print :CFBundleExecutable',
    join(app, 'Info.plist'),
  ]).trim()
  const executable = join(container, binary)
  const pids = command(['/bin/ps', '-axo', 'pid=,comm='])
    .split('\n')
    .flatMap((line) => {
      const match = line.match(/^\s*(\d+)\s+(.+)$/)
      return match && match[2].trim() === executable ? [match[1]] : []
    })
  if (pids.length !== 1)
    throw new Error(
      `expected one live simulator app at ${executable}; found ${pids.length}`
    )
  const { stdout } = await promisify(execFile)('/usr/bin/vmmap', ['-summary', pids[0]], {
    encoding: 'utf8',
    timeout: 5000,
    maxBuffer: 16 * 1024 * 1024,
  })
  writeFileSync(rawPath, stdout)
  const match = stdout.match(/^Physical footprint:\s+([\d.]+)\s*([BKMGT]?)/m)
  if (!match) throw new Error(`no physical footprint in ${rawPath}`)
  const scale = {
    '': 1 / 1048576,
    B: 1 / 1048576,
    K: 1 / 1024,
    M: 1,
    G: 1024,
    T: 1048576,
  }[match[2]]!
  return {
    ...phase,
    engine,
    metric: 'host-physical-footprint',
    value: Number(match[1]) * scale,
    unit: 'MiB',
  }
}

if (import.meta.main) {
  const { values: args } = parseArgs({
    options: {
      device: { type: 'string' },
      simulator: { type: 'string' },
      host: { type: 'string', default: hostname() },
      'device-name': { type: 'string' },
      os: { type: 'string' },
      commit: { type: 'string' },
      app: { type: 'string', multiple: true },
      order: { type: 'string', default: 'alternating' },
      runs: { type: 'string', default: '10' },
      timeout: { type: 'string', default: '180' },
      cooldown: { type: 'string', default: '10' },
      out: { type: 'string' },
      lock: { type: 'string' },
      'stop-on-done': { type: 'boolean', default: false },
      'simulator-log-process': { type: 'string' },
      'reset-data': { type: 'boolean', default: false },
      'engine-env': { type: 'string', multiple: true, default: [] },
      'launch-arg': { type: 'string', multiple: true, default: [] },
    },
  })
  if (
    Boolean(args.device) === Boolean(args.simulator) ||
    !args['device-name'] ||
    !args.os ||
    !args.commit ||
    !args.out ||
    !args.app?.length
  )
    throw new Error(
      'require exactly one --device or --simulator, plus --device-name, --os, --commit, --out and --app engine=/path/App.app'
    )
  if (!args.simulator && (args['simulator-log-process'] || args['reset-data']))
    throw new Error('--simulator-log-process and --reset-data require --simulator')
  const runs = Number(args.runs),
    timeout = Number(args.timeout),
    cooldown = Number(args.cooldown)
  if (
    !Number.isInteger(runs) ||
    runs < 1 ||
    !Number.isFinite(timeout) ||
    timeout <= 0 ||
    !Number.isFinite(cooldown) ||
    cooldown < 0 ||
    !['alternating', 'balanced'].includes(args.order!)
  )
    throw new Error('invalid runs, timeout, cooldown or order')
  const apps = args.app.map((spec) => {
    const separator = spec.indexOf('=')
    if (separator < 1) throw new Error(`invalid app: ${spec}`)
    const engine = spec.slice(0, separator),
      app = resolve(spec.slice(separator + 1))
    const commit = readFileSync(join(dirname(app), 'commit.txt'), 'utf8').trim()
    if (commit !== args.commit)
      throw new Error(`build commit mismatch for ${app}: ${commit}`)
    const bundle = command([
      '/usr/libexec/PlistBuddy',
      '-c',
      'Print :CFBundleIdentifier',
      join(app, 'Info.plist'),
    ]).trim()
    return { engine, app, bundle }
  })
  if (new Set(apps.map((app) => app.engine)).size !== apps.length)
    throw new Error('distinct engines required')
  const launchEnvironment: Record<string, Record<string, string>> = {}
  for (const entry of args['engine-env']!) {
    const match = entry.match(/^([^:]+):([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match || !apps.some((app) => app.engine === match[1]))
      throw new Error(`invalid engine environment: ${entry}`)
    ;(launchEnvironment[match[1]] ??= {})[match[2]] = match[3]
  }
  const lockPath =
    args.lock ??
    join(
      homedir(),
      args.simulator
        ? `builders/.scratch/bun-bench/simulator-${args.simulator}.lock`
        : 'builders/.scratch/bun-aot-rn/iphone.lock'
    )
  mkdirSync(dirname(lockPath), { recursive: true })
  const sourceHash = (url: URL) =>
    createHash('sha256').update(readFileSync(url)).digest('hex')
  const metadata = {
    device: args.simulator
      ? `${args['device-name']} simulator (${args.host})`
      : args['device-name'],
    udid: args.device ?? args.simulator,
    target: args.simulator ? 'simulator' : 'device',
    host: args.host,
    order: args.order,
    cooldownSeconds: cooldown,
    launchEnvironment,
    simulatorLogProcess: args['simulator-log-process'] ?? null,
    resetData: args['reset-data'],
    os: args.os,
    commit: args.commit,
    runs,
    method:
      'Release · alternating engines · process-cold launches · warm OS caches' +
      (launchEnvironment.bun?.BUN_JSC_useJIT === 'false' &&
      launchEnvironment.bun?.BUN_JSC_useWasm === 'false'
        ? ' · Bun JIT/Wasm off'
        : ''),
    apps,
    runnerSha256: sourceHash(new URL(import.meta.url)),
    reportSha256: sourceHash(new URL('./report.ts', import.meta.url)),
    environments: [] as Record<string, unknown>[],
  }
  if (args.device && process.env.BENCH_LOCK_HELD !== '1') {
    const result = spawnSync(
      'flock',
      [lockPath, process.execPath, ...process.argv.slice(1)],
      {
        env: { ...process.env, BENCH_LOCK_HELD: '1' },
        stdio: 'inherit',
      }
    )
    if (result.error) throw result.error
    process.exit(result.status ?? 1)
  }
  mkdirSync(dirname(args.out), { recursive: true })
  mkdirSync(args.out, { recursive: false })
  writeFileSync(join(args.out, 'manifest.json'), JSON.stringify(metadata, null, 2))
  const rows: Sample[] = []
  const installed = new Map<string, string>()
  for (let run = 0; run < runs; run++) {
    const order =
      args.order === 'alternating' || run % 2 === 0 ? apps : [...apps].reverse()
    for (const { engine, app, bundle } of order) {
      if (args['reset-data']) {
        const removal = spawnSync(
          'xcrun',
          ['simctl', 'uninstall', args.simulator!, bundle],
          { encoding: 'utf8' }
        )
        if (removal.error) throw removal.error
        if (
          removal.status &&
          !/not installed|No such file or directory/i.test(removal.stderr)
        )
          throw new Error(`simulator uninstall failed: ${removal.stderr}`)
        installed.delete(bundle)
      }
      if (installed.get(bundle) !== engine) {
        const receipt = command(
          args.simulator
            ? ['xcrun', 'simctl', 'install', args.simulator, app]
            : [
                'xcrun',
                'devicectl',
                'device',
                'install',
                'app',
                '--device',
                args.device!,
                app,
              ],
          300_000
        )
        writeFileSync(
          join(args.out, `${String(run).padStart(2, '0')}-${engine}-install.log`),
          receipt
        )
        installed.set(bundle, engine)
      }
      await sleep(cooldown * 1000)
      const launchArgs = ['--bench', '--bench-run', String(run), ...args['launch-arg']!]
      const argv = args.simulator
        ? [
            'xcrun',
            'simctl',
            'launch',
            '--terminate-running-process',
            '--console-pty',
            args.simulator,
            bundle,
            ...launchArgs,
          ]
        : [
            'xcrun',
            'devicectl',
            'device',
            'process',
            'launch',
            '--device',
            args.device!,
            '--terminate-existing',
            '--console',
            bundle,
            '--',
            ...launchArgs,
          ]
      const log = join(args.out, `${String(run).padStart(2, '0')}-${engine}.log`)
      const env = { ...process.env }
      for (const [key, value] of Object.entries(launchEnvironment[engine] ?? {}))
        env[`${args.simulator ? 'SIMCTL_CHILD_' : 'DEVICECTL_CHILD_'}${key}`] = value
      const logProcess = args['simulator-log-process']
      const logger = logProcess
        ? [
            'xcrun',
            'simctl',
            'spawn',
            args.simulator!,
            'log',
            'stream',
            '--style',
            'compact',
            '--level',
            'debug',
            '--predicate',
            `process == ${JSON.stringify(logProcess)} AND eventMessage CONTAINS "BENCH"`,
          ]
        : argv
      const returncode = await captureConsole(
        logger,
        log,
        timeout,
        Boolean(logProcess) || args['stop-on-done']!,
        {
          env,
          readyText: logProcess ? 'Filtering the log data' : undefined,
          onReady: logProcess
            ? async () => {
                const { stdout } = await promisify(execFile)(
                  'xcrun',
                  [
                    'simctl',
                    'launch',
                    '--terminate-running-process',
                    args.simulator!,
                    bundle,
                    ...launchArgs,
                  ],
                  { env, encoding: 'utf8', timeout: timeout * 1000 }
                )
                writeFileSync(log.replace(/\.log$/, '-launch.log'), stdout)
              }
            : undefined,
          onPhase: args.simulator
            ? (phase) =>
                hostFootprint(
                  args.simulator!,
                  bundle,
                  app,
                  engine,
                  phase,
                  log.replace(
                    /\.log$/,
                    `-${phase.case.replace(/[^a-zA-Z0-9_-]/g, '_')}-vmmap.log`
                  )
                )
            : undefined,
        }
      )
      const text = readFileSync(log, 'utf8')
      if (returncode || !text.includes('BENCH_DONE') || text.includes('BENCH_ERROR'))
        throw new Error(`incomplete run: ${log} (exit ${returncode})`)
      for (const line of text.split('\n')) {
        if (!line.includes('BENCH_META ')) continue
        const environment = JSON.parse(line.slice(line.indexOf('BENCH_META ') + 11))
        if (
          (environment.engine && environment.engine !== engine) ||
          environment.os !== args.os
        )
          throw new Error(`metadata mismatch: ${JSON.stringify(environment)}`)
        metadata.environments.push({ ...environment, engine, run })
      }
      const samples = parseLines(text)
      if (
        !samples.length ||
        samples.some((row) => row.engine !== engine || String(row.run) !== String(run))
      )
        throw new Error(`engine/run mismatch or empty run: ${log}`)
      const signature = (entries: Sample[]) =>
        JSON.stringify(
          [
            ...new Set(
              entries.map((row) =>
                JSON.stringify([row.app, row.case, row.metric, row.unit])
              )
            ),
          ].sort()
        )
      if (rows.length && signature(samples) !== signature(rows))
        throw new Error(`case coverage changed: ${log}`)
      rows.push(...samples)
      report(rows, join(args.out, 'charts'), metadata)
    }
  }
  console.log(
    `Completed ${runs * apps.length} launches: ${join(args.out, 'charts/index.html')}`
  )
}
