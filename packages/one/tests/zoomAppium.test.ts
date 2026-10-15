import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { runZoomWithAppium } from '../../../tests/native-features/scripts/one-native-zoom-appium'

const suite = vi.hoisted(() => vi.fn())
vi.mock('../../../tests/native-features/scripts/one-native-zoom-suite', () => ({ runZoomSuite: suite }))
type Browser = Parameters<typeof runZoomWithAppium>[0]
let artifactDir: string
beforeEach(() => {
  suite.mockReset()
  artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), 'one-zoom-appium-'))
})
afterEach(() => fs.rmSync(artifactDir, { recursive: true, force: true }))
const active = { pid: 123, bundleId: 'dev.fixture' }
const source = {
  type: 'Application', rawIdentifier: null, label: 'Fixture',
  rect: { x: 0, y: 0, width: 393, height: 852 },
  children: [
    { type: 'Other', rawIdentifier: 'zoom-test-screen', label: null, rect: { x: 0, y: 0, width: 393, height: 852 } },
    { type: 'StaticText', rawIdentifier: 'zoom-source-identity', label: 'mount:1;mode:aligned', rect: { x: 0, y: 0, width: 30, height: 10 } },
    { type: 'Other', rawIdentifier: 'zoom-source-item-1', name: 'wrong-fallback', label: 'Source', rect: { x: 10, y: 20, width: 30, height: 40 } },
  ],
}
function driver(processes = [active, active], tree = source) {
  let index = 0
  return {
    execute: vi.fn(async (command: string) => command === 'mobile: activeAppInfo' ? processes[index++] : tree),
    waitUntil: vi.fn(async (condition: () => Promise<boolean>) => {
      if (!await condition()) throw new Error('native condition was not satisfied')
    }),
  } as unknown as Browser
}
function run(browser: Browser) {
  return runZoomWithAppium(browser, 'simulator', active.bundleId, artifactDir, vi.fn())
}

it('passes actual identifiers, labels, geometry and process identity to the native suite', async () => {
  suite.mockImplementation(async (options) => {
    const nodes = await options.wait('native geometry', (nodes: any[]) =>
      nodes.some((node) => node.AXUniqueId === 'zoom-source-item-1' && node.frame.height === 40))
    expect(nodes[3]).toEqual({ AXUniqueId: 'zoom-source-item-1', AXLabel: 'Source', pid: 123, frame: source.children[2].rect })
  })
  await run(driver())
  expect(suite).toHaveBeenCalledOnce()
})

it('rejects the wrong foreground app before native observation', async () => {
  await expect(run(driver([{ pid: 123, bundleId: 'com.apple.springboard' }]))).rejects.toThrow('foreground fixture app')
  expect(suite).not.toHaveBeenCalled()
})

it('rejects process replacement during observation', async () => {
  suite.mockImplementation(async (options) => options.wait('native geometry', () => true))
  await expect(run(driver([active, { ...active, pid: 456 }]))).rejects.toThrow('process changed')
})

it('does not accept a tree from another screen even when its node predicate passes', async () => {
  suite.mockImplementation(async (options) => options.wait('native geometry', () => true))
  const tree = { ...source, children: [source.children[2]] }
  await expect(run(driver([active, active], tree))).rejects.toThrow('native condition was not satisfied')
})

it('accepts the native detail screen after the source screen leaves the accessibility tree', async () => {
  suite.mockImplementation(async (options) => options.wait('native detail', () => true))
  const tree = { ...source, children: [{ ...source.children[2], rawIdentifier: 'zoom-detail-card' }] }
  await run(driver([active, active], tree))
})
