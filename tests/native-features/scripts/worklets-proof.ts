import assert from 'node:assert/strict'
import {
  byId,
  close,
  expectState,
  has,
  open,
  platform,
  screenshot,
  swipe,
  tap,
  webPage,
  writeOutcome,
} from './worklets-device'

try {
  await open()
  const initial = await expectState(
    'fixture starts without callbacks',
    (nodes) =>
      has(nodes, 'runOnUI: pending') &&
      has(nodes, 'Gesture runtime: pending') &&
      has(nodes, 'Layout: pending') &&
      Boolean(byId(nodes, 'one-native-gestures-box'))
  )
  await screenshot('before')
  const box = byId(initial, 'one-native-gestures-box')
  const layout = byId(initial, 'worklets-layout-box')
  assert(box && layout, 'both fixture views must be mounted')
  const scale = box.width / 72
  const runtime = platform === 'web' ? 'web' : 'ui'
  await tap('worklets-run-ui', initial)
  const ui = await expectState(
    'runOnUI executes on the expected runtime and moves the view',
    (nodes) => {
      const current = byId(nodes, 'one-native-gestures-box')
      return (
        has(nodes, `runOnUI: ${runtime}:40`) &&
        Boolean(current && Math.abs(current.x - box.x - 40 * scale) < 3 * scale)
      )
    }
  )
  await tap('worklets-resize', ui)
  const resized = await expectState(
    'layout animation completes and changes view geometry',
    (nodes) => {
      const current = byId(nodes, 'worklets-layout-box')
      return (
        has(nodes, `Layout: ${runtime}`) &&
        Boolean(current && Math.abs(current.width - layout.width * 2.5) < 3 * scale)
      )
    }
  )
  const current = byId(resized, 'one-native-gestures-box')
  assert(current, 'gesture view must remain mounted')
  const start = {
    x: Math.round(current.x + current.width / 2),
    y: Math.round(current.y + current.height / 2),
  }
  const end = { x: start.x + Math.round(90 * scale), y: start.y }
  if (platform === 'web') {
    await webPage().mouse.move(start.x, start.y)
    await webPage().mouse.down()
    await webPage().mouse.move(end.x, end.y, { steps: 20 })
    await webPage().mouse.up()
  } else swipe(start, end, 0.7)
  await expectState(
    'gesture runs on the expected runtime, reports drag and finishes timing',
    (nodes) => {
      const current = byId(nodes, 'one-native-gestures-box')
      const drag = nodes
        .find((node) => /^Drag: -?\d+$/.test(node.label))
        ?.label.match(/-?\d+/)?.[0]
      return (
        has(nodes, `Gesture runtime: ${runtime}`) &&
        has(nodes, 'Animation: finished') &&
        Boolean(drag && Number(drag) >= 65 && Number(drag) <= 110) &&
        Boolean(current && Math.abs(current.x - box.x - 120 * scale) < 3 * scale)
      )
    }
  )
  await screenshot('after')
  writeOutcome()
  console.info(`${platform}: all worklet runtime checks passed`)
} finally {
  await close()
}
