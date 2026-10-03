import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

// run against the Release fixture under the machine's exclusive measurement gate.
const [simulator, output] = process.argv.slice(2)
if (!simulator || !output) {
  throw new Error('usage: pager-ios-benchmark.ts <simulator UDID> <output.json>')
}
function command(workflow: string, name: string, args: string[] = []) {
  const result = JSON.parse(
    execFileSync(
      'xcodebuildmcp',
      [workflow, name, '--simulator-id', simulator, ...args, '--output', 'json'],
      { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
    ),
  )
  if (result.didError) throw new Error(JSON.stringify(result))
  return result
}
function snapshot() {
  return command('simulator', 'snapshot-ui').data.capture
}
const axe = process.env.AXE_PATH ?? 'axe'
function nativeInput(...args: string[]) {
  const result = execFileSync(axe, [...args, '--udid', simulator!], { encoding: 'utf8' })
  if (result.includes('could not establish simulator input')) throw new Error(result)
  return result
}
type Node = {
  AXUniqueId?: string
  type?: string
  frame?: { x: number; y: number; width: number; height: number }
  children?: Node[]
}
function nativeNode(identifier: string) {
  const tree: Node[] = JSON.parse(nativeInput('describe-ui'))
  function find(nodes: Node[]): Node | undefined {
    for (const node of nodes) {
      if (node.AXUniqueId === identifier && node.type !== 'StaticText') return node
      const child = find(node.children ?? [])
      if (child) return child
    }
  }
  const node = find(tree)
  if (!node?.frame) throw new Error(`missing native frame for ${identifier}`)
  return node.frame
}
function tap(identifier: string) {
  const frame = nativeNode(identifier)
  nativeInput('touch', '-x', String(Math.round(frame.x + frame.width / 2)),
    '-y', String(Math.round(frame.y + frame.height / 2)), '--down', '--up', '--delay', '0.15')
}
function wait(text: string) {
  command('ui-automation', 'wait-for-ui', [
    '--predicate', 'textContains', '--text', text, '--timeout-ms', '15000',
  ])
}
const measurements: Record<string, unknown>[] = []
for (const component of ['One.UI.Pager', 'pager-view 8.0.5']) {
  if (component === 'pager-view 8.0.5') tap('one-ui-pager-baseline')
  wait(component)
  for (let sample = 0; sample < 7; sample++) {
    tap('one-ui-pager-instant-2')
    wait('selected:2')
    wait('page 2')
    wait('state:idle')
    tap('one-ui-pager-reset-stats')
    wait('ready')
    const stage = nativeNode('one-ui-pager-stage')
    // keep the gesture clear of the centered keyboard probe.
    const y = stage.y + stage.height * 0.25
    nativeInput('drag', '--start-x', String(stage.x + stage.width * 0.15),
      '--start-y', String(y), '--end-x', String(stage.x + stage.width * 0.85),
      '--end-y', String(y), '--duration', '1', '--steps', '120')
    wait('selected:1')
    wait('state:idle')
    tap('one-ui-pager-report')
    wait('{"component":')
    const rows: string[] = snapshot().text
    const row = rows.find((value) => value.includes('|{"component":'))
    if (!row) throw new Error(`missing benchmark report: ${rows.join('\n')}`)
    const report = JSON.parse(row.split('|')[3]!)
    if (report.component !== component || report.events < 20 ||
        !report.fractional || report.progress !== 1 || report.meanUs <= 0) {
      throw new Error(`invalid drag measurement: ${JSON.stringify(report)}`)
    }
    measurements.push({ sample, ...report })
    // preserve completed samples even if a later native command fails.
    writeFileSync(output, JSON.stringify({ simulator, duration: 1, distance: 0.7, measurements }, null, 2) + '\n')
    console.log(JSON.stringify({ sample, ...report }))
  }
  execFileSync('xcrun', ['simctl', 'io', simulator, 'screenshot',
    output.replace(/\.json$/, component === 'One.UI.Pager' ? '-one.png' : '-pager-view.png')])
}
