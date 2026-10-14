import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

// install the observer while stopped, then let UIKit drive its real callbacks.
export async function attachZoomDebugger(pid: number, probe: string, artifactDir: string) {
  const outputFile = path.join(artifactDir, 'zoom-debugger-output.txt')
  const receiptFile = path.join(artifactDir, 'zoom-debugger-commands.json')
  const marker = `ONE_ZOOM_ATTACHED_${pid}`
  const commands = [
    'settings set target.preload-symbols false',
    `process attach --pid ${pid}`,
    `script assert lldb.debugger.GetSelectedTarget().GetProcess().GetProcessID() == ${pid}`,
    `command script import ${JSON.stringify(probe)}`,
    'script lldb.debugger.SetAsync(True)',
    'process continue',
    `script print(${JSON.stringify(marker)})`,
  ]
  const receipt = { commands, pid, startedAt: new Date().toISOString() }
  fs.writeFileSync(outputFile, '')
  const save = () => fs.writeFileSync(receiptFile, JSON.stringify(receipt, null, 2))
  save()
  const debuggerProcess = spawn('xcrun', ['lldb', '--no-lldbinit', '--no-use-colors'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  let output = ''
  const ready = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('zoom native debugger attach timed out after 30000ms'))
    }, 30_000)
    const fail = (error: Error) => {
      clearTimeout(timer)
      reject(error)
    }
    const read = (data: Buffer) => {
      const text = data.toString()
      fs.appendFileSync(outputFile, text)
      output += text
      if (output.split(/\r?\n/).includes(marker)) {
        clearTimeout(timer)
        resolve()
      }
    }
    debuggerProcess.stdout.on('data', read)
    debuggerProcess.stderr.on('data', read)
    debuggerProcess.once('error', fail)
    debuggerProcess.once('exit', (code, signal) =>
      fail(new Error(`zoom debugger exited: ${code ?? signal}`))
    )
    debuggerProcess.stdin.on('error', fail)
  })
  const detach = async () => {
    if (debuggerProcess.exitCode !== null || debuggerProcess.signalCode !== null) return
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        debuggerProcess.kill('SIGKILL')
        reject(new Error('zoom native debugger detach timed out after 30000ms'))
      }, 30_000)
      debuggerProcess.once('exit', (code, signal) => {
        clearTimeout(timer)
        if (code === 0) resolve()
        else reject(new Error(`zoom debugger detach exited: ${code ?? signal}`))
      })
      debuggerProcess.stdin.end('process interrupt\nprocess detach\nquit\n')
    })
  }
  debuggerProcess.stdin.write(commands.join('\n') + '\n')
  try {
    await ready
    if (/^error:|Traceback/m.test(output)) throw new Error(`zoom debugger command failed: ${output}`)
    const events = fs.readFileSync(path.join(artifactDir, 'zoom-native-events.jsonl'), 'utf8')
    if (!events.split('\n').filter(Boolean).some((line) => JSON.parse(line).probe === 'ready')) {
      throw new Error('zoom native debugger did not install the callback observer')
    }
    Object.assign(receipt, { attachedAt: new Date().toISOString() })
    save()
  } catch (error) {
    Object.assign(receipt, { failedAt: new Date().toISOString(), error: String(error) })
    save()
    // a stuck attach also stalls the detach; report both, attach first, so
    // the detach timeout never hides why the attach failed.
    const detachError = await detach().then(
      () => undefined,
      (failure: unknown) => failure
    )
    if (detachError) throw new Error(`${String(error)}, then ${String(detachError)}`, { cause: error })
    throw error
  }
  return async () => {
    await detach()
    Object.assign(receipt, { detachedAt: new Date().toISOString() })
    save()
  }
}
