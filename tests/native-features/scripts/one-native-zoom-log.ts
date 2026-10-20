import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const subsystem = 'dev.onestack.one'

function runLogConfig(simulatorId: string, args: string[]): string {
  const result = spawnSync('xcrun', ['simctl', 'spawn', simulatorId, 'log', 'config', ...args], {
    encoding: 'utf8',
    timeout: 30_000,
  })
  if (result.status !== 0) {
    const detail = result.error ? String(result.error) : (result.stderr || '').trim()
    throw new Error(`log config ${args.join(' ')} failed: ${detail || 'unknown error'}`)
  }
  return result.stdout
}

// One logs each UIKit call into its zoom providers at debug level; streaming
// the fixture process's log turns those lines into the suite's events.
export async function streamZoomCallbacks(simulatorId: string, pid: number, artifactDir: string) {
  const eventFile = path.join(artifactDir, 'zoom-native-events.jsonl')
  const outputFile = path.join(artifactDir, 'zoom-log-stream.txt')
  fs.writeFileSync(eventFile, '')
  fs.writeFileSync(outputFile, '')
  // raise the subsystem to debug so provider callbacks stream, restoring the exact prior level on every exit.
  // an unreadable prior level fails here before the stream spawns, so ready always means debug is active.
  const status = runLogConfig(simulatorId, ['--status', '--subsystem', subsystem])
  const statusLine = status.split('\n').find((entry) => entry.includes('Mode for'))
  const priorLevel =
    statusLine?.match(/Mode for '[^']*'\s+([A-Za-z_]+)/)?.[1]?.toLowerCase()
  if (priorLevel !== 'off' && priorLevel !== 'default' && priorLevel !== 'info' && priorLevel !== 'debug') {
    throw new Error(`could not parse prior log level from: ${status.trim() || '(empty)'}`)
  }
  runLogConfig(simulatorId, ['--mode', 'level:debug', '--subsystem', subsystem])
  fs.appendFileSync(outputFile, `zoom log level for ${subsystem}: ${priorLevel} -> debug\n`)
  let restored = false
  const restoreLogLevel = () => {
    if (restored) return
    runLogConfig(simulatorId, ['--mode', `level:${priorLevel}`, '--subsystem', subsystem])
    restored = true
    fs.appendFileSync(outputFile, `zoom log level for ${subsystem} restored to ${priorLevel}\n`)
  }
  const predicate = `processIdentifier == ${pid} AND subsystem == "${subsystem}" AND category == "zoom"`
  const stream = spawn(
    'xcrun',
    ['simctl', 'spawn', simulatorId, 'log', 'stream', '--level', 'debug', '--style', 'ndjson', '--predicate', predicate],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  )
  let pending = ''
  const ready = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('zoom log stream did not start within 30000ms'))
    }, 30_000)
    const fail = (error: Error) => {
      clearTimeout(timer)
      reject(error)
    }
    stream.stdout.on('data', (data: Buffer) => {
      const text = data.toString()
      fs.appendFileSync(outputFile, text)
      // the stream announces its filter before any entry
      if (text.includes('Filtering the log data')) {
        clearTimeout(timer)
        resolve()
      }
      pending += text
      const lines = pending.split('\n')
      pending = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('{')) continue
        const message = JSON.parse(line).eventMessage
        if (typeof message === 'string') fs.appendFileSync(eventFile, message + '\n')
      }
    })
    stream.stderr.on('data', (data: Buffer) => fs.appendFileSync(outputFile, data.toString()))
    stream.once('error', fail)
    stream.once('exit', (code, signal) => fail(new Error(`zoom log stream exited: ${code ?? signal}`)))
  })
  try {
    await ready
  } catch (error) {
    stream.kill('SIGKILL')
    try {
      restoreLogLevel()
    } catch (restoreError) {
      throw new Error(
        `${String(error)}; also failed to restore the zoom log level: ${String(restoreError)}`
      )
    }
    throw error
  }
  return async () => {
    try {
      if (stream.exitCode === null && stream.signalCode === null) {
        await new Promise<void>((resolve) => {
          const timer = setTimeout(() => stream.kill('SIGKILL'), 10_000)
          stream.once('exit', () => {
            clearTimeout(timer)
            resolve()
          })
          stream.kill('SIGINT')
        })
      }
    } finally {
      restoreLogLevel()
    }
  }
}
