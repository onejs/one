import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { runZoomSuite } from '../../../tests/native-features/scripts/one-native-zoom-suite'

const native = vi.hoisted(() => vi.fn())
vi.mock('node:child_process', () => ({ execFileSync: native }))

let artifactDir: string
beforeEach(() => {
  native.mockReset()
  artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), 'one-zoom-debugger-'))
})
afterEach(() => fs.rmSync(artifactDir, { recursive: true, force: true }))

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

it('preserves attach timeout output and rethrows the original error', async () => {
  const failure = Object.assign(new Error('spawnSync xcodebuildmcp ETIMEDOUT'), {
    stdout: 'debugger starting', stderr: 'attach pending', signal: 'SIGTERM', status: null,
  })
  native.mockImplementation(() => { throw failure })
  await expect(run()).rejects.toBe(failure)
  expect(receipts()).toEqual([expect.objectContaining({
    args: expect.arrayContaining(['attach', '--pid', '123']),
    startedAt: expect.any(String), failedAt: expect.any(String),
    error: failure.message, stdout: 'debugger starting', stderr: 'attach pending',
    signal: 'SIGTERM', status: null,
  })])
})

it('distinguishes successful attach from probe setup failure and retains detach output', async () => {
  const failure = Object.assign(new Error('probe import failed'), { stderr: 'python import diagnostic' })
  native.mockReturnValueOnce(JSON.stringify({ data: { session: { debugSessionId: 'debug-session' } } }))
    .mockImplementationOnce(() => { throw failure })
    .mockReturnValueOnce('detached')
  await expect(run()).rejects.toBe(failure)
  expect(receipts()).toEqual([
    expect.objectContaining({ args: expect.arrayContaining(['attach']), completedAt: expect.any(String) }),
    expect.objectContaining({ args: expect.arrayContaining(['lldb-command']), error: failure.message, stderr: 'python import diagnostic' }),
    expect.objectContaining({ args: ['detach', '--debug-session-id', 'debug-session'], stdout: 'detached', completedAt: expect.any(String) }),
  ])
})
