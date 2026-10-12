import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

// observe the mount transaction, rather than querying after the navigation touch returns.
export function observeGpuMount(simulatorId: string, bundleId: string, artifactDir: string) {
  const eventFile = path.join(artifactDir, 'gpu-native-mounts.jsonl')
  const probe = path.join(artifactDir, 'gpu_native_probe.py')
  fs.copyFileSync(new URL('./gpu_native_probe.py', import.meta.url), probe)
  fs.writeFileSync(eventFile, '')
  const native = (args: string[]) => execFileSync('xcodebuildmcp', ['debugging', ...args], {
    encoding: 'utf8', timeout: 30_000,
    env: { ...process.env, XCODEBUILDMCP_DEBUGGER_BACKEND: 'lldb-cli' },
  })
  const attached = native(['attach', '--simulator-id', simulatorId, '--bundle-id', bundleId,
    '--continue-on-attach', 'false', '--output', 'json'])
  fs.writeFileSync(path.join(artifactDir, 'gpu-debugger-attach.json'), attached)
  const debugSessionId = JSON.parse(attached).data?.session?.debugSessionId
  if (!debugSessionId) throw new Error('gpu native debugger did not attach')
  const close = () => fs.writeFileSync(path.join(artifactDir, 'gpu-debugger-detach.json'),
    native(['detach', '--debug-session-id', debugSessionId, '--output', 'json']))
  const events = () => fs.readFileSync(eventFile, 'utf8').trim().split('\n').filter(Boolean)
    .map((line) => JSON.parse(line))
  try {
    for (const command of ['expr -l objc++ -- @import UIKit;', `command script import "${probe}"`]) {
      const output = native(['lldb-command', '--debug-session-id', debugSessionId,
        '--command', command, '--output', 'json'])
      fs.appendFileSync(path.join(artifactDir, 'gpu-debugger-setup.jsonl'), output + '\n')
      if (JSON.parse(output).didError) throw new Error('gpu native observer setup failed')
    }
    if (!events().some((event) => event.probe === 'ready'))
      throw new Error('gpu native mounting callback was not instrumented')
    native(['continue', '--debug-session-id', debugSessionId, '--output', 'json'])
  } catch (error) {
    close()
    throw error
  }
  return {
    pending() {
      const recorded = events()
      if (recorded.some((event) => event.error)) throw new Error('gpu native mount observation failed')
      const nodes = recorded.find((event) => event.kind === 'mounted')?.nodes ?? []
      return nodes.some((node: { id: string; mounted: boolean }) =>
        node.id === 'one-native-gpu-screen' && node.mounted) &&
        nodes.some((node: { label: string; mounted: boolean }) =>
          node.label === 'Triangle: pending' && node.mounted)
    },
    close,
  }
}
