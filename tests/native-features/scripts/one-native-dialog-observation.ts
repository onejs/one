import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

type DialogEvent = {
  probe?: string
  error?: string
  kind?: string
  host?: string
  controller?: string
  class?: string
  title?: string
  live?: boolean
  value?: boolean
  acknowledged?: number
  revision?: number
  count?: number
  id?: string
  presenting?: string
}

// the native acknowledgement must follow the callback and actually re-present its controller.
export function alertRollbackObserved(events: DialogEvent[]) {
  if (events.some((event) => event.error)) return false
  const opened = events.findIndex(
    (event) =>
      event.kind === 'configure' &&
      event.value === true &&
      event.acknowledged === 2 &&
      event.revision === 0
  )
  const host = events[opened]?.host
  const initial = events.findIndex(
    (event, index) =>
      index > opened &&
      event.kind === 'appeared' &&
      event.live === true &&
      event.class === 'SwiftUI.PlatformAlertController' &&
      event.title === 'One Native Alert'
  )
  const controller = events[initial]?.controller
  if (!host || !controller) return false
  const disappeared = events.findIndex(
    (event, index) =>
      index > initial && event.kind === 'disappeared' && event.controller === controller
  )
  const change = events.findIndex(
    (event, index) =>
      index > initial &&
      event.kind === 'change' &&
      event.value === false &&
      event.count === 3 &&
      event.revision === 0
  )
  const action = events.findIndex(
    (event, index) =>
      index > initial &&
      event.kind === 'action' &&
      event.id === 'cancel' &&
      event.presenting === 'alert-item' &&
      event.count === 3
  )
  const acknowledged = events.findIndex(
    (event, index) =>
      index > change &&
      event.kind === 'configure' &&
      event.host === host &&
      event.value === true &&
      event.acknowledged === 3 &&
      event.revision === 0
  )
  const restored = events.findIndex(
    (event, index) =>
      index > acknowledged &&
      index > disappeared &&
      event.kind === 'appeared' &&
      event.controller === controller &&
      event.title === 'One Native Alert' &&
      event.live === true
  )
  return (
    disappeared > initial &&
    change > initial &&
    action > initial &&
    acknowledged > change &&
    restored > acknowledged &&
    !events
      .slice(acknowledged + 1)
      .some(
        (event) =>
          event.kind === 'configure' &&
          (event.host !== host ||
            event.value !== true ||
            event.acknowledged !== 3 ||
            event.revision !== 0)
      ) &&
    events.slice(initial + 1).filter((event) => event.kind === 'change').length === 1 &&
    events.slice(initial + 1).filter((event) => event.kind === 'action').length === 1 &&
    !events
      .slice(restored + 1)
      .some((event) => event.kind === 'disappeared' && event.controller === controller)
  )
}

export function observeAlertRollback(
  simulatorId: string,
  bundleId: string,
  artifactDir: string
) {
  const eventFile = path.join(artifactDir, 'dialog-native-events.jsonl')
  const probe = path.join(artifactDir, 'dialog_native_probe.py')
  fs.copyFileSync(new URL('./dialog_native_probe.py', import.meta.url), probe)
  fs.writeFileSync(eventFile, '')
  const native = (args: string[]) =>
    execFileSync('xcodebuildmcp', ['debugging', ...args], {
      encoding: 'utf8',
      timeout: 30_000,
    })
  const attached = JSON.parse(
    native([
      'attach',
      '--simulator-id',
      simulatorId,
      '--bundle-id',
      bundleId,
      '--continue-on-attach',
      '--output',
      'json',
    ])
  )
  const debugSessionId = attached.data?.session?.debugSessionId
  if (!debugSessionId) throw new Error('dialog native debugger did not attach')
  const events = (): DialogEvent[] =>
    fs
      .readFileSync(eventFile, 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line))
  const close = () =>
    fs.writeFileSync(
      path.join(artifactDir, 'dialog-debugger-detach.txt'),
      native(['detach', '--debug-session-id', debugSessionId])
    )
  try {
    fs.writeFileSync(
      path.join(artifactDir, 'dialog-debugger-setup.txt'),
      native([
        'lldb-command',
        '--debug-session-id',
        debugSessionId,
        '--command',
        `command script import "${probe}"`,
      ])
    )
    if (!events().some((event) => event.probe === 'ready'))
      throw new Error('native dialog callbacks were not instrumented')
  } catch (error) {
    close()
    throw error
  }
  return { observed: () => alertRollbackObserved(events()), close }
}
