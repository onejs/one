import { spawn } from 'node:child_process'
import { constants } from 'node:os'
import { pipeline } from 'node:stream/promises'

export class LocalBuildCancelled extends Error {
  constructor(readonly signal: NodeJS.Signals) {
    super(`Local package build cancelled by ${signal}`)
  }

  get exitCode() {
    return 128 + constants.signals[this.signal]
  }
}

export async function runLocalBuild(packageNames: string[]): Promise<void> {
  const child = spawn(
    'bun',
    ['x', 'turbo', 'run', 'build', ...packageNames.map((name) => `--filter=${name}`)],
    { detached: true, stdio: ['ignore', 'pipe', 'pipe'] }
  )
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const
  let cancellation: LocalBuildCancelled | undefined
  let stopped: Promise<void> | undefined

  const killGroup = (signal: NodeJS.Signals) => {
    if (!child.pid) return
    try {
      process.kill(-child.pid, signal)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error
    }
  }
  const cancel = (signal: NodeJS.Signals) => {
    if (cancellation) return
    cancellation = new LocalBuildCancelled(signal)
    killGroup(signal)
    // descendants may ignore cancellation or outlive the group leader.
    stopped = new Promise((resolve) => {
      setTimeout(() => {
        killGroup('SIGKILL')
        resolve()
      }, 1000)
    })
  }
  const handlers = signals.map((signal) => {
    const handler = () => cancel(signal)
    process.on(signal, handler)
    return [signal, handler] as const
  })

  try {
    const closed = new Promise<void>((resolve, reject) => {
      child.once('error', reject)
      child.once('close', (code, signal) => {
        if (code === 0) resolve()
        else reject(new Error(`Local package build failed (${signal ?? code})`))
      })
    })
    // wait for both pipes even when the command fails or is cancelled.
    const results = await Promise.allSettled([
      closed,
      pipeline(child.stdout!, process.stdout, { end: false }),
      pipeline(child.stderr!, process.stderr, { end: false }),
    ])
    await stopped
    if (cancellation) throw cancellation
    for (const result of results) {
      if (result.status === 'rejected') throw result.reason
    }
  } finally {
    for (const [signal, handler] of handlers) process.removeListener(signal, handler)
  }
}
