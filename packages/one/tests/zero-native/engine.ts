import assert from 'node:assert/strict'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createInterface } from 'node:readline'
import type { Engine } from '../../src/zero/native/types'

export class DriverEngine implements Engine {
  private process: ChildProcessWithoutNullStreams
  private waiters: {
    resolve: (value: string) => void
    reject: (reason: Error) => void
  }[] = []
  private readyResolve!: () => void
  private readyReject!: (error: Error) => void
  ready = new Promise<void>((resolve, reject) => {
    this.readyResolve = resolve
    this.readyReject = reject
  })
  exited: Promise<number | null>
  constructor(
    driver: string,
    readonly path: string,
    schemaFile: string,
    clientID: string
  ) {
    this.process = spawn(driver, [path, schemaFile, clientID])
    this.exited = new Promise((resolve) => this.process.once('exit', resolve))
    let started = false
    createInterface({ input: this.process.stdout }).on('line', (line) => {
      const parsed = JSON.parse(line)
      if (!started) {
        started = true
        if (parsed.error) this.readyReject(new Error(parsed.error))
        else this.readyResolve()
        return
      }
      const waiter = this.waiters.shift()
      if (!waiter) throw new Error('unexpected native driver response')
      if (parsed.error) waiter.reject(new Error(parsed.error))
      else waiter.resolve(JSON.stringify(parsed.result))
    })
    this.process.stderr.on('data', (data) => process.stderr.write(data))
    this.process.on('error', (error) => this.readyReject(error))
    this.process.on('exit', (code) => {
      const error = new Error(`native driver exited: ${code}`)
      this.readyReject(error)
      for (const waiter of this.waiters.splice(0)) waiter.reject(error)
    })
  }
  async execute(request: string): Promise<string> {
    await this.ready
    return new Promise((resolve, reject) => {
      this.waiters.push({ resolve, reject })
      this.process.stdin.write(request + '\n')
    })
  }
  async raw(request: object) {
    return JSON.parse(await this.execute(JSON.stringify(request)))
  }
  async close() {
    this.process.stdin.end()
    assert.equal(await this.exited, 0)
  }
  async crash() {
    this.process.stdin.write('@crash\n')
    assert.equal(await this.exited, 0)
  }
}
