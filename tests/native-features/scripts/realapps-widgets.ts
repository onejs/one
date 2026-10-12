import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { closeSync, openSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

type Frame = { x: number; y: number; width: number; height: number }
export type WidgetNode = {
  AXLabel?: string
  AXValue?: string
  AXUniqueId?: string
  pid?: number
  frame?: Frame
  children?: WidgetNode[]
}
const flatten = (nodes: WidgetNode[]): WidgetNode[] =>
  nodes.flatMap((node) => [node, ...flatten(node.children ?? [])])

class MissingSurface extends Error {}

// receipts and app text cannot satisfy a renderer assertion. all desired leaves
// must belong to one native renderer process and have real layout.
export function assertWidgetSurface(
  nodes: WidgetNode[],
  expected: string[],
  rendererPids: number[]
) {
  const leaves = flatten(nodes).filter(
    (node) =>
      node.pid &&
      rendererPids.includes(node.pid) &&
      node.frame &&
      node.frame.width > 0 &&
      node.frame.height > 0
  )
  const pid = rendererPids.find((pid) =>
    expected.every((label) =>
      leaves.some((node) => node.pid === pid && node.AXLabel === label)
    )
  )
  if (!pid) throw new MissingSurface(`Native renderer missing ${expected.join(' / ')}`)
  return { pid, expected }
}

export function widgetActivityIsAbsent(nodes: WidgetNode[], rendererPids: number[]) {
  return !flatten(nodes).some(
    (node) =>
      node.AXUniqueId === 'activity-content-view' ||
      (node.pid &&
        rendererPids.includes(node.pid) &&
        node.frame &&
        node.frame.width > 0 &&
        node.frame.height > 0 &&
        (node.AXLabel || node.AXValue))
  )
}

function assertIsland(nodes: WidgetNode[], step: number, rendererPids: number[]) {
  const expected = ['Native API probe', 'Box', `Step ${step}`, 'Open probe']
  const surface = assertWidgetSurface(nodes, expected, rendererPids)
  const root = nodes.find((node) => node.pid === surface.pid && node.children?.length)
  assert(root?.frame, 'Expanded Island root bounds missing')
  const frame = root.frame
  const leaves = flatten([root]).filter(
    (node) => !node.children?.length && (node.AXLabel || node.AXValue) && node.frame
  )
  for (const node of leaves) {
    const f = node.frame!
    assert(
      f.x >= frame.x &&
        f.y >= frame.y &&
        f.x + f.width <= frame.x + frame.width &&
        f.y + f.height <= frame.y + frame.height,
      `Expanded Island clips ${node.AXLabel ?? node.AXValue}`
    )
  }
  const title = leaves.find((node) => node.AXLabel === 'Native API probe')!
  const link = leaves.find((node) => node.AXLabel === 'Open probe')!
  const leading = leaves.find((node) => node.AXLabel === `Step ${step}`)!
  assert(
    title.frame!.height <= link.frame!.height,
    'Expanded title must stay single-line'
  )
  assert(
    leading.frame!.x >= frame.x + 26 && leading.frame!.y >= frame.y + 26,
    'Expanded leading step must clear rounded corners'
  )
  assert(
    leaves.filter((node) => node.AXValue === `${step === 1 ? 33 : 67}%`).length >= 2,
    'Expanded gauge and progress must track the same step'
  )
  return surface
}

export async function runNativeWidgets(config: {
  device: string
  appId: string
  out: string
  machine?: string
}) {
  const { device, appId, out, machine } = config
  const quote = (s: string) => `'${s.replaceAll("'", "'\\''")}'`
  const command = (args: string[]) =>
    machine
      ? [
          'ssh',
          '-o',
          'BatchMode=yes',
          '-o',
          'ConnectTimeout=10',
          machine,
          args.map(quote).join(' '),
        ]
      : args
  const run = (args: string[]) => {
    const [file, ...rest] = command(args)
    return execFileSync(file, rest, { encoding: 'utf8', timeout: 30_000 })
  }
  const axe = (args: string[]) => run(['axe', ...args, '--udid', device])
  const sim = (args: string[]) =>
    run(['xcrun', 'simctl', ...args.slice(0, 1), device, ...args.slice(1)])
  const save = (name: string, value: unknown) =>
    writeFileSync(join(out, `${name}.json`), JSON.stringify(value, null, 2) + '\n')
  const app = () => (JSON.parse(axe(['describe-ui'])) as WidgetNode[]).slice(0, 1)
  const point = (x: number, y: number) =>
    JSON.parse(axe(['describe-ui', '--point', `${x},${y}`])) as WidgetNode
  const touch = (x: number, y: number, delay = 0.15) =>
    axe([
      'touch',
      '-x',
      String(x),
      '-y',
      String(y),
      '--down',
      '--up',
      '--delay',
      String(delay),
    ])
  const swipe = (x: number, y: number, endX: number, endY: number) =>
    axe([
      'swipe',
      '--start-x',
      String(x),
      '--start-y',
      String(y),
      '--end-x',
      String(endX),
      '--end-y',
      String(endY),
      '--duration',
      '0.4',
    ])
  const wait = async <T>(name: string, read: () => T, accepts: (value: T) => boolean) => {
    const deadline = Date.now() + 25_000
    let value: T
    do {
      value = read()
      if (accepts(value)) return value
      await Bun.sleep(150)
    } while (Date.now() < deadline)
    save(`fail-${name}`, value!)
    throw new Error(`${name} missing after 25000ms; see ${out}`)
  }
  const tap = async (id: string) => {
    const node = await wait(
      id,
      () =>
        flatten(app()).find(
          (node) =>
            (node.AXUniqueId === id || node.AXLabel === id) &&
            node.frame &&
            node.frame.width > 0 &&
            node.frame.height > 0 &&
            node.frame.y >= 0 &&
            node.frame.y + node.frame.height <= 874
        ),
      Boolean
    )
    const f = node!.frame!
    touch(f.x + f.width / 2, f.y + f.height / 2)
  }
  const report = () => {
    const node = flatten(app()).find((node) => node.AXUniqueId === 'realapps-api-results')
    assert(node?.AXLabel, 'Fixture results missing')
    return JSON.parse(node.AXLabel).results as Record<
      string,
      {
        status: string
        value?: Record<string, any>
      }
    >
  }
  const action = async (id: string, api: string) => {
    await tap(`realapps-api-${id}`)
    const results = await wait(id, report, (results) =>
      ['observed', 'failed'].includes(results[api]?.status)
    )
    save(id, results)
    assert.equal(results[api].status, 'observed', `${api} call failed`)
    return results[api].value!
  }
  const originalFrame = app()[0].frame
  assert.equal(originalFrame?.width, 402, 'Widget oracle requires iPhone 17 Pro geometry')
  assert.equal(
    originalFrame?.height,
    874,
    'Widget oracle requires iPhone 17 Pro geometry'
  )
  const initialLaunch = sim(['launch', appId]).trim()
  const foreground = async () => {
    assert.equal(
      sim(['launch', appId]).trim(),
      initialLaunch,
      'Activity holder process restarted'
    )
    await wait('fixture', app, (nodes) =>
      flatten(nodes).some((node) => node.AXUniqueId === 'realapps-api-widgets-write')
    )
  }
  const home = async () => {
    // settings gets us to Home while keeping the exact activity holder alive.
    sim(['launch', 'com.apple.Preferences'])
    await wait('Settings foreground', app, (nodes) => nodes[0].AXLabel === 'Settings')
    sim(['terminate', 'com.apple.Preferences'])
    const nodes = await wait('Home page', app, (nodes) =>
      flatten(nodes).some((node) => node.AXUniqueId === 'Page control')
    )
    const page = flatten(nodes).find(
      (node) => node.AXUniqueId === 'Page control'
    )!.AXValue
    assert(
      ['Page 1 of 2', 'Page 2 of 2'].includes(page!),
      'Expected calibrated two-page Home layout'
    )
    save('home-before-navigation', nodes)
    if (page === 'Page 2 of 2') {
      const flow = join(out, 'home-page.yaml')
      writeFileSync(
        flow,
        `appId: ${appId}\n---\n- swipe:\n    start: "10%, 50%"\n    end: "90%, 50%"\n    duration: 400\n`
      )
      if (machine) {
        const remote = `/tmp/one-widget-home-${process.pid}.yaml`
        execFileSync('scp', [flow, `${machine}:${remote}`], { timeout: 30_000 })
        run(['maestro', '--device', device, 'test', remote])
        run(['rm', '--', remote])
      } else run(['maestro', '--device', device, 'test', flow])
    }
    save('home-after-navigation', app())
    await wait('Home page one', app, (nodes) =>
      flatten(nodes).some(
        (node) => node.AXUniqueId === 'Page control' && node.AXValue === 'Page 1 of 2'
      )
    )
  }
  const homeNodes = () =>
    [
      [100, 140],
      [100, 160],
      [60, 180],
      [100, 220],
    ].map(([x, y]) => point(x, y))
  const cardNodes = () => [point(160, 710)]
  const islandNodes = () => [point(200, 30)]
  const renderers = (nodes: WidgetNode[], kind: 'Default' | 'Activities') =>
    [
      ...new Set(
        flatten(nodes)
          .map((node) => node.pid)
          .filter(Boolean)
      ),
    ].filter(
      (pid) =>
        run(['ps', '-p', String(pid), '-o', 'comm='])
          .trim()
          .split('/')
          .pop() === `WidgetRenderer_${kind}`
    ) as number[]
  const capture = (name: string, nodes: WidgetNode[]) => {
    save(`${name}.ax`, nodes)
    const target = machine
      ? `/tmp/one-widget-${process.pid}-${name}.png`
      : join(out, `${name}.png`)
    sim(['io', 'screenshot', '--type=png', target])
    if (machine)
      execFileSync('scp', [`${machine}:${target}`, join(out, `${name}.png`)], {
        timeout: 30_000,
      })
  }
  const surface = async (
    name: string,
    read: () => WidgetNode[],
    expected: string[],
    kind: 'Default' | 'Activities',
    islandStep?: number
  ) => {
    const nodes = await wait(name, read, (nodes) => {
      try {
        assertWidgetSurface(nodes, expected, renderers(nodes, kind))
        return true
      } catch (error) {
        if (error instanceof MissingSurface) return false
        throw error
      }
    })
    const pids = renderers(nodes, kind)
    const result = islandStep
      ? assertIsland(nodes, islandStep, pids)
      : assertWidgetSurface(nodes, expected, pids)
    capture(name, nodes)
    save(`${name}.assert`, {
      ...result,
      renderer: run(['ps', '-p', String(result.pid), '-o', 'comm=']).trim(),
      passed: true,
    })
    return nodes
  }
  const omitted = (
    name: string,
    nodes: WidgetNode[],
    expected: string[],
    kind: 'Default' | 'Activities'
  ) => {
    let rejected = false
    try {
      assertWidgetSurface(nodes, expected, renderers(nodes, kind))
    } catch (error) {
      if (!(error instanceof MissingSurface)) throw error
      rejected = true
    }
    assert(rejected, `${name} stale surface satisfied desired-state assertion`)
    capture(name, nodes)
    save(`${name}.assert`, { expected, rejected })
  }
  const cover = async () => {
    await home()
    swipe(100, 1, 100, 650)
    // permission-covered content is never accepted as the rendered precondition.
    for (const label of ['Allow', 'Always Allow']) {
      if (flatten(app()).some((node) => node.AXLabel === label)) await tap(label)
    }
  }
  const expand = async () => {
    await home()
    touch(200, 30, 1)
  }
  const fd = openSync(join(out, 'activity-native.log'), 'w')
  const logger = Bun.spawn(
    command([
      'xcrun',
      'simctl',
      'spawn',
      device,
      'log',
      'stream',
      '--style',
      'compact',
      '--level',
      'debug',
      '--predicate',
      'subsystem == "com.apple.activitykit"',
    ]),
    { stdout: fd, stderr: fd }
  )
  const log = () => readFileSync(join(out, 'activity-native.log'), 'utf8')
  const event = async (name: string, text: string) => {
    await wait(name, log, (log) => log.includes(text))
    save(name, {
      text,
      lines: log()
        .split('\n')
        .filter((line) => line.includes(text)),
    })
  }
  const scalar = ['Native API probe', '42', 'real app snapshot']
  const jsx = ['Step 2', 'Open probe']
  const started = ['Native API probe', 'Preparing', '1 of 3']
  const updated = ['Native API probe', 'On the way', '2 of 3']
  try {
    await action('widgets-jsx', 'One.iOS.WidgetUI')
    await home()
    const jsxSeed = await surface('home-jsx-seed', homeNodes, jsx, 'Default')
    omitted('home-scalar-omitted', jsxSeed, scalar, 'Default')
    await foreground()
    await action('widgets-write', 'One.Widgets')
    await home()
    const scalarNodes = await surface('home-scalar', homeNodes, scalar, 'Default')
    omitted('home-jsx-omitted', scalarNodes, jsx, 'Default')
    await foreground()
    await action('widgets-jsx', 'One.iOS.WidgetUI')
    await home()
    await surface('home-jsx-restored', homeNodes, jsx, 'Default')
    for (const isJSX of [false, true]) {
      await cover()
      const empty = cardNodes()
      assert(
        widgetActivityIsAbsent(empty, renderers(empty, 'Activities')),
        'End existing native activities before starting the fixture'
      )
      capture(isJSX ? 'jsx-before-start' : 'scalar-before-start', empty)
      await foreground()
      const prefix = isJSX ? 'activity-jsx' : 'activity'
      const api = isJSX ? 'One.LiveActivities.jsx' : 'One.LiveActivities'
      const { id } = await action(`${prefix}-start`, api)
      assert.match(
        id,
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,
        'Native activity identifier'
      )
      await event(`${prefix}-native-start`, `Created activity: ${id}`)
      await cover()
      const first = await surface(
        `${prefix}-start-surface`,
        cardNodes,
        isJSX ? ['Step 1', 'Open probe'] : started,
        'Activities'
      )
      omitted(`${prefix}-update-omitted`, first, isJSX ? jsx : updated, 'Activities')
      if (isJSX) {
        await expand()
        const island = await surface(
          'island-step1',
          islandNodes,
          ['Native API probe', 'Box', 'Step 1', 'Open probe'],
          'Activities',
          1
        )
        omitted(
          'island-update-omitted',
          island,
          ['Native API probe', 'Box', 'Step 2', 'Open probe'],
          'Activities'
        )
      }
      await foreground()
      const result = await action(
        `${prefix}-update`,
        isJSX ? `${api}.update` : 'One.LiveActivities.update'
      )
      assert.equal(result.id, id, 'Update must keep the native start ID')
      await event(`${prefix}-native-update`, `Updating activity: ${id}; payload:`)
      await cover()
      await surface(
        `${prefix}-updated-surface`,
        cardNodes,
        isJSX ? jsx : updated,
        'Activities'
      )
      if (isJSX) {
        await expand()
        await surface(
          'island-step2',
          islandNodes,
          ['Native API probe', 'Box', 'Step 2', 'Open probe'],
          'Activities',
          2
        )
      }
      await foreground()
      const end = await action(
        `${prefix}-end`,
        isJSX ? `${api}.end` : 'One.LiveActivities.end'
      )
      assert.equal(end.id, id, 'End must keep the native start ID')
      await event(`${prefix}-native-dismissed`, `Activity dismissed: ${id}`)
      await cover()
      const absent = await wait(`${prefix}-absent`, cardNodes, (nodes) =>
        widgetActivityIsAbsent(nodes, renderers(nodes, 'Activities'))
      )
      capture(`${prefix}-ended`, absent)
      if (isJSX) {
        await expand()
        const nodes = islandNodes()
        assert(
          widgetActivityIsAbsent(nodes, renderers(nodes, 'Activities')),
          'Ended Island content remains'
        )
        capture('island-ended', nodes)
      }
      save(`${prefix}-end.assert`, { id, absent: true, nativeDismissed: true })
    }
    await foreground()
    const falsifiers = await action('activity-falsify', 'One.LiveActivities.falsifiers')
    assert.equal(falsifiers.pushToken, null)
    for (const key of [
      'endedUpdate',
      'endedEnd',
      'missingUpdate',
      'missingUpdateView',
      'missingEnd',
      'missingPushToken',
      'endedUpdateView',
    ])
      assert.equal(falsifiers[key].code, 'activity_missing', key)
    save('widget-surfaces', {
      passed: true,
      apis: ['One.Widgets', 'One.iOS.WidgetUI', 'One.LiveActivities'],
      surfaces: [
        'Home scalar/JSX',
        'cover-sheet scalar/JSX lifecycle',
        'expanded JSX Island lifecycle',
      ],
      expandedIslandProof: 'Native renderer AX; simulator PNG excludes this overlay',
      limits:
        'No root/aggregate, compact/minimal Island, scalar Island or hardware-lock acceptance',
    })
  } finally {
    logger.kill()
    await logger.exited
    closeSync(fd)
  }
}
