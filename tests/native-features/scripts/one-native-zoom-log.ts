import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

// One logs each UIKit call into its zoom providers at debug level; streaming
// the fixture process's log turns those lines into the suite's events.
export async function streamZoomCallbacks(simulatorId: string, pid: number, artifactDir: string) {
  const eventFile = path.join(artifactDir, 'zoom-native-events.jsonl')
  const outputFile = path.join(artifactDir, 'zoom-log-stream.txt')
  fs.writeFileSync(eventFile, '')
  fs.writeFileSync(outputFile, '')
  const predicate = `processIdentifier == ${pid} AND subsystem == "dev.onestack.one" AND category == "zoom"`
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
    throw error
  }
  return async () => {
    if (stream.exitCode !== null || stream.signalCode !== null) return
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => stream.kill('SIGKILL'), 10_000)
      stream.once('exit', () => {
        clearTimeout(timer)
        resolve()
      })
      stream.kill('SIGINT')
    })
  }
}
