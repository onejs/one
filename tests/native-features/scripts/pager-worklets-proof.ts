// proves One.UI.Pager feeds Reanimated worklet event handlers on the UI thread:
// with the JS thread busy-waiting, a native swipe moves the page-offset-driven
// indicator; the JS-handler control under the same block leaves it in place.
// web has one thread, so it proves the same handler and ref API without a block.
import assert from 'node:assert/strict'
import {
  byId,
  close,
  deviceClockOffset,
  expectState,
  has,
  type Node,
  open,
  platform,
  screenshot,
  swipe,
  tap,
  timing,
  webPage,
  writeOutcome,
} from './worklets-device'

const STEP = 100

try {
  await open()
  const initial = await expectState(
    'fixture mounts the animated pager on page 0',
    (nodes) =>
      has(nodes, 'JS: idle') &&
      has(nodes, 'Selected: 0') &&
      Boolean(
        byId(nodes, 'pager-worklets-indicator') && byId(nodes, 'pager-worklets-page-0')
      )
  )
  await screenshot('before')
  const indicator = byId(initial, 'pager-worklets-indicator')
  const pager = byId(initial, 'pager-worklets-page-0')
  assert(indicator && pager, 'indicator and first page must be mounted')
  const scale = indicator.width / 32
  const near = (a: number, b: number) => Math.abs(a - b) < 3 * scale
  const indicatorAt = (nodes: Node[], progress: number) => {
    const current = byId(nodes, 'pager-worklets-indicator')
    return Boolean(current && near(current.x, indicator.x + progress * STEP * scale))
  }
  const pageShown = (nodes: Node[], index: number) => {
    const page = byId(nodes, `pager-worklets-page-${index}`)
    return Boolean(page && near(page.x, pager.x))
  }
  const native = platform !== 'web'
  const runtime = native ? 'ui' : 'web'
  const swipeTo = async (direction: 'next' | 'previous') => {
    const y = pager.y + pager.height / 2
    const [from, to] = direction === 'next' ? [0.8, 0.2] : [0.2, 0.8]
    if (native)
      return swipe(
        { x: pager.x + pager.width * from, y },
        { x: pager.x + pager.width * to, y },
        0.4
      )
    await webPage().mouse.move(pager.x + pager.width / 2, y)
    await webPage().mouse.wheel(direction === 'next' ? pager.width : -pager.width, 0)
  }

  const clockOffset = deviceClockOffset()
  const blocks: Record<string, unknown>[] = []
  // taps Block JS, swipes once the block is showing, and requires a snapshot that
  // satisfies `during` while the label still says blocking. the fixture reports the
  // block window on the device clock; the swipe and that snapshot must fall inside it.
  async function blockedSwipe(
    name: string,
    nodes: Node[],
    direction: 'next' | 'previous',
    during: (nodes: Node[]) => boolean,
    after: (nodes: Node[], events: number) => boolean
  ) {
    await tap('pager-worklets-block', nodes)
    await expectState(`${name}: JS reports it is blocking`, (nodes) =>
      has(nodes, 'JS: blocking')
    )
    const swipedAt = Date.now()
    await swipeTo(direction)
    const step = `${name}: snapshot while JS is blocked`
    await expectState(step, (nodes) => has(nodes, 'JS: blocking') && during(nodes))
    await screenshot(`${name}-during-block`)
    const seen = timing(step)
    const report = /^JS: blocked (\d+)\.\.(\d+), ui events (\d+)$/
    const done = await expectState(
      `${name}: JS unblocks`,
      (nodes) =>
        nodes.some((node) => {
          const match = node.label.match(report)
          return Boolean(match && after(nodes, Number(match[3])))
        }),
      30_000
    )
    const [, start, end, events] = done
      .map((node) => node.label.match(report))
      .find(Boolean)!
      .map(Number)
    const window = { start: start + clockOffset, end: end + clockOffset }
    assert(
      window.start <= swipedAt && seen.to <= window.end,
      `${name}: swipe at ${swipedAt} and snapshot ${seen.from}..${seen.to} must fall inside the block ${window.start}..${window.end}`
    )
    blocks.push({ name, clockOffset, window, swipedAt, snapshot: seen, events })
  }

  if (native) {
    // worklet handler under a blocked JS thread
    await blockedSwipe(
      'worklet',
      initial,
      'next',
      (nodes) => pageShown(nodes, 1) && indicatorAt(nodes, 1),
      (nodes, events) =>
        events > 0 &&
        has(nodes, `Scroll runtime: ${runtime}`) &&
        has(nodes, 'Selected: 1')
    )
  } else {
    await swipeTo('next')
    await expectState(
      'the scroll moves the indicator one page through the worklet handler',
      (nodes) =>
        pageShown(nodes, 1) &&
        indicatorAt(nodes, 1) &&
        has(nodes, `Scroll runtime: ${runtime}`) &&
        has(nodes, 'Selected: 1')
    )
  }

  // the imperative ref still reaches the pager through the animated wrapper
  const beforeSetPage = await expectState('pager rests on page 1', (nodes) =>
    has(nodes, 'Selected: 1')
  )
  await tap('pager-worklets-set-page', beforeSetPage)
  const onPage2 = await expectState(
    'ref setPage(2) selects page 2 and the indicator follows',
    (nodes) => has(nodes, 'Selected: 2') && pageShown(nodes, 2) && indicatorAt(nodes, 2)
  )

  if (native) {
    // control: the same block with a plain JS onPageScroll leaves the indicator behind
    await tap('pager-worklets-js-handler', onPage2)
    const control = await expectState(
      'control pager remounts on page 0 with a JS handler',
      (nodes) =>
        has(nodes, 'Scroll runtime: js') && pageShown(nodes, 0) && indicatorAt(nodes, 0)
    )
    await blockedSwipe(
      'js-handler',
      control,
      'next',
      (nodes) => pageShown(nodes, 1) && indicatorAt(nodes, 0),
      (nodes, events) => events === 0 && indicatorAt(nodes, 1)
    )
  }
  await screenshot('after')
  writeOutcome({ blocks })
  console.info(`${platform}: pager worklet checks passed`)
} finally {
  await close()
}
