import fs from 'node:fs'
import path from 'node:path'
import type { Browser } from 'webdriverio'
import { runZoomSuite } from './one-native-zoom-suite'

type SourceNode = {
  type: string
  rawIdentifier: string | null
  label: string | null
  rect: { x: number; y: number; width: number; height: number }
  children?: SourceNode[]
}

// keep the fixture's existing automation session through debugger observation.
export async function runZoomWithAppium(
  driver: Browser,
  simulatorId: string,
  bundleId: string,
  artifactDir: string,
  screenshot: (name: string) => Promise<unknown>,
) {
  fs.mkdirSync(artifactDir, { recursive: true })
  const active = await driver.execute('mobile: activeAppInfo') as { pid: number; bundleId: string }
  if (active.bundleId !== bundleId || !Number.isInteger(active.pid) || active.pid <= 0)
    throw new Error('zoom requires the foreground fixture app and its native process id')
  fs.writeFileSync(path.join(artifactDir, 'zoom-appium-process.json'), JSON.stringify(active, null, 2))
  type Node = { AXUniqueId?: string; AXLabel?: string; pid: number; frame: SourceNode['rect'] }
  const snapshot = async (): Promise<Node[]> => {
    const current = await driver.execute('mobile: activeAppInfo') as typeof active
    if (current.bundleId !== bundleId || current.pid !== active.pid)
      throw new Error('zoom fixture process changed during native observation')
    const root = await driver.execute('mobile: source', { format: 'json' }) as SourceNode
    fs.writeFileSync(path.join(artifactDir, 'zoom-appium-source.json'), JSON.stringify(root, null, 2))
    if (root.type !== 'Application' || !root.rect)
      throw new Error('zoom requires the native application accessibility tree')
    const nodes: Node[] = []
    const visit = (node: SourceNode) => {
      nodes.push({
        AXUniqueId: node.rawIdentifier ?? undefined,
        AXLabel: node.label ?? undefined,
        pid: active.pid,
        frame: node.rect,
      })
      for (const child of node.children ?? []) visit(child)
    }
    visit(root)
    return nodes
  }
  await runZoomSuite({
    simulatorId,
    artifactDir,
    tap: async ({ id }) => { await driver.$(`~${id}`).click() },
    wait: async (name, predicate) => {
      let nodes: Node[] = []
      await driver.waitUntil(async () => {
        nodes = await snapshot()
        return nodes.some((node) => node.AXUniqueId === 'zoom-source-identity' || node.AXUniqueId === 'zoom-detail-card') && predicate(nodes)
      }, { timeout: 15_000, interval: 250, timeoutMsg: `${name} timed out after 15000ms` })
      return nodes
    },
    screenshot,
    pass: (name) => console.log(`PASS ${name}`),
  })
}
