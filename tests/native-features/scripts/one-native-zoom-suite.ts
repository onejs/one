import { streamZoomCallbacks } from './one-native-zoom-log'
import fs from 'node:fs'
import path from 'node:path'

type Node = {
  AXUniqueId?: string
  AXLabel?: string
  pid?: number
  frame?: { x: number; y: number; width: number; height: number }
}
type Event = {
  kind?: string
  identifier?: string
  view?: string
  testID?: string
  mounted?: boolean
  rect?: number[] | null
}

// observes UIKit invoking One's real providers; reaching the route earns no pass.
export async function runZoomSuite(options: {
  simulatorId: string
  artifactDir: string
  tap: (target: { id: string }) => unknown
  wait: (name: string, predicate: (nodes: Node[]) => boolean) => Promise<Node[]>
  screenshot: (name: string) => unknown
  pass: (name: string) => void
}) {
  const { simulatorId, artifactDir, tap, wait, screenshot, pass } = options
  fs.mkdirSync(artifactDir, { recursive: true })
  const eventFile = path.join(artifactDir, 'zoom-native-events.jsonl')
  const events = (): Event[] =>
    fs
      .readFileSync(eventFile, 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line))
  const find = (nodes: Node[], id: string) => nodes.find((n) => n.AXUniqueId === id)
  const nodes = await wait('zoom source has native geometry', (n) =>
    Boolean(find(n, 'zoom-source-item-1')?.frame?.height)
  )
  const pid = nodes.find((n) => n.pid)?.pid
  if (!pid) throw new Error('zoom observation requires the mounted app process id')
  const stop = await streamZoomCallbacks(simulatorId, pid, artifactDir)
  const measurements: unknown[] = []
  const failures: string[] = []
  const ensure = (name: string, condition: boolean) => {
    fs.writeFileSync(
      path.join(artifactDir, 'zoom-native-measurements.json'),
      JSON.stringify(measurements, null, 2)
    )
    if (condition) pass(name)
    else failures.push(name)
  }
  try {
    let mountedSource: string | undefined
    for (const mode of ['aligned', 'omitted', 'mismatched', 'unaligned', 'aligned']) {
      await tap({ id: `zoom-mode-${mode}` })
      const before = await wait(`zoom ${mode} source mode commits`, (n) =>
        Boolean(find(n, 'zoom-source-identity')?.AXLabel?.endsWith(`mode:${mode}`))
      )
      const identity = find(before, 'zoom-source-identity')!.AXLabel
      const start = events().length
      await tap({ id: 'zoom-source-item-1' })
      const detail = await wait(`zoom ${mode} detail has native geometry`, (n) =>
        Boolean(find(n, 'zoom-detail-card')?.frame?.height && find(n, 'zoom-back-button'))
      )
      const frame = find(detail, 'zoom-detail-card')!.frame!
      const detailIdentity = find(detail, 'zoom-detail-identity')?.AXLabel
      await screenshot(`zoom-${measurements.length}-${mode}-detail.png`)
      const push = events().slice(start)
      const popStart = events().length
      await tap({ id: 'zoom-back-button' })
      const after = await wait(
        `zoom ${mode} returns to mounted source`,
        (n) =>
          find(n, 'zoom-source-identity')?.AXLabel === identity &&
          Boolean(find(n, 'zoom-source-item-1')?.frame)
      )
      await screenshot(`zoom-${measurements.length}-${mode}-source.png`)
      const pop = events().slice(popStart)
      measurements.push({
        mode,
        sourceIdentity: identity,
        detailIdentity,
        frame,
        sourceFrame: find(after, 'zoom-source-item-1')!.frame,
        push,
        pop,
      })
      ensure(
        `${mode} detail preserves mounted source identity`,
        Boolean(detailIdentity?.startsWith(`${identity};source:item-1;`))
      )
      if (mode === 'omitted') {
        ensure(
          'omitted Enabler never supplies a zoom source or alignment',
          [...push, ...pop].every((e) => !e.kind)
        )
        continue
      }
      for (const [direction, observation] of [
        ['push', push],
        ['pop', pop],
      ] as const) {
        const sources = observation.filter((e) => e.kind === 'source')
        const alignments = observation.filter((e) => e.kind === 'alignment')
        if (mode === 'mismatched') {
          ensure(
            `mismatched ${direction} cannot resolve a source or alignment`,
            sources.length > 0 &&
              sources.every(
                (e) => e.identifier === 'missing-source' && e.view === '0x0'
              ) &&
              alignments.length === 0
          )
          continue
        }
        ensure(
          `${mode} ${direction} UIKit invokes both zoom providers`,
          sources.length > 0 && alignments.length > 0
        )
        ensure(
          `${mode} ${direction} resolves the actual mounted native source`,
          sources.every(
            (e) =>
              e.identifier === 'item-1' &&
              e.testID === 'zoom-source-item-1' &&
              e.mounted &&
              (!mountedSource || e.view === mountedSource)
          )
        )
        mountedSource = sources[0]?.view || mountedSource
        if (mode === 'unaligned') {
          ensure(
            `${direction} omitted detector supplies no alignment`,
            alignments.every((e) => e.rect === null)
          )
        } else {
          const expected = [frame.x, frame.y, frame.width, frame.height]
          ensure(
            `aligned ${direction} supplies the mounted detail rectangle`,
            alignments.every((e) =>
              e.rect?.every((v, i) => Math.abs(v - expected[i]!) < 0.001)
            )
          )
        }
      }
    }
    if (failures.length)
      throw new Error(
        `${failures.join('; ')} failed; zoom-native-measurements.json records native callbacks`
      )
  } finally {
    await stop()
  }
}
