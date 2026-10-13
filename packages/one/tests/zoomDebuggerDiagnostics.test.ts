import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import { PassThrough, Writable } from 'node:stream'
import { attachZoomDebugger } from '../../../tests/native-features/scripts/one-native-zoom-debugger'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { runZoomSuite } from '../../../tests/native-features/scripts/one-native-zoom-suite'

const native = vi.hoisted(() => vi.fn())
vi.mock('node:child_process', () => ({ spawn: native }))

let artifactDir: string
beforeEach(() => {
  native.mockReset()
  vi.useFakeTimers()
  artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), 'one-zoom-debugger-'))
})
afterEach(() => {
  vi.useRealTimers()
  fs.rmSync(artifactDir, { recursive: true, force: true })
})

function run() {
  const nodes = [{ pid: 123, AXUniqueId: 'zoom-source-item-1', frame: { x: 1, y: 2, width: 3, height: 4 } }]
  return runZoomSuite({
    simulatorId: 'simulator', artifactDir,
    tap: vi.fn(), screenshot: vi.fn(), pass: vi.fn(),
    wait: async (_name, predicate) => {
      expect(predicate(nodes)).toBe(true)
      return nodes
    },
  })
}

function receipts() {
  return JSON.parse(fs.readFileSync(path.join(artifactDir, 'zoom-debugger-commands.json'), 'utf8'))
}

function debuggerProcess(onCommands: (commands: string, child: any) => void) {
  const child = Object.assign(new EventEmitter(), {
    stdout: new PassThrough(), stderr: new PassThrough(),
    exitCode: null as number | null, signalCode: null,
    kill: vi.fn(), stdin: undefined as unknown as Writable,
  })
  child.stdin = new Writable({
    write(chunk, _encoding, done) {
      const commands = chunk.toString()
      if (commands.includes('process detach')) {
        child.stdout.write('detached\n')
        child.exitCode = 0
        child.emit('exit', 0, null)
      } else onCommands(commands, child)
      done()
    },
  })
  native.mockReturnValue(child)
  return child
}
function output() {
  return fs.readFileSync(path.join(artifactDir, 'zoom-debugger-output.txt'), 'utf8')
}

it('preserves attach timeout output and detaches before rejecting', async () => {
  const child = debuggerProcess((_commands, process) => {
    process.stdout.write('debugger starting\n')
    process.stderr.write('attach pending\n')
  })
  const rejected = expect(run()).rejects.toThrow('attach timed out after 30000ms')
  await vi.advanceTimersByTimeAsync(30_000)
  await rejected
  expect(receipts()).toEqual(expect.objectContaining({
    pid: 123, startedAt: expect.any(String), failedAt: expect.any(String),
    error: expect.stringContaining('attach timed out after 30000ms'),
  }))
  expect(output()).toContain('debugger starting\nattach pending\ndetached')
  expect(child.exitCode).toBe(0)
  expect(child.kill).not.toHaveBeenCalled()
})

it('distinguishes probe setup failure and retains detach output', async () => {
  debuggerProcess((_commands, process) => {
    process.stderr.write('Traceback: python import diagnostic\n')
    process.stdout.write('ONE_ZOOM_ATTACHED_123\n')
  })
  await expect(run()).rejects.toThrow('zoom debugger command failed: Traceback: python import diagnostic')
  expect(receipts()).toEqual(expect.objectContaining({
    failedAt: expect.any(String), error: expect.stringContaining('python import diagnostic'),
  }))
  expect(receipts().attachedAt).toBeUndefined()
  expect(output()).toContain('detached')
})

it('rejects a completed command stream without the native observer ready event', async () => {
  fs.writeFileSync(path.join(artifactDir, 'zoom-native-events.jsonl'), '')
  debuggerProcess((_commands, process) => process.stdout.write('ONE_ZOOM_ATTACHED_123\n'))
  await expect(run()).rejects.toThrow('did not install the callback observer')
  expect(output()).toContain('detached')
})

it('requires the observer ready event before accepting attach and records detach', async () => {
  fs.writeFileSync(path.join(artifactDir, 'zoom-native-events.jsonl'), '{"probe":"ready"}\n')
  debuggerProcess((_commands, process) => process.stdout.write('ONE_ZOOM_ATTACHED_123\n'))
  const detach = await attachZoomDebugger(123, '/observer.py', artifactDir)
  expect(receipts().attachedAt).toEqual(expect.any(String))
  await detach()
  expect(receipts().detachedAt).toEqual(expect.any(String))
  expect(output()).toContain('detached')
})
