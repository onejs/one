import { One } from 'one'
import { Platform } from 'react-native'

declare global {
  var __oneBackgroundTaskProof: string | undefined
}

console.log('[bg-proof] handlers module evaluating')
globalThis.__oneBackgroundTaskProof = 'handlers-ready'
if (Platform.OS === 'ios' || Platform.OS === 'android')
  One.BackgroundTasks.defineTask('dev.vxrn.native.tests.refresh', async (task) => {
    console.log(`[bg-proof] refresh handler invoked aborted=${task.signal.aborted}`)
    await Promise.resolve()
    if (task.signal.aborted) return
    globalThis.__oneBackgroundTaskProof = `refresh:${task.identifier}`
  })

if (Platform.OS === 'ios' || Platform.OS === 'android')
  One.BackgroundTasks.defineTask(
    'dev.vxrn.native.tests.processing',
    (task) =>
      new Promise<void>((resolve) => {
        globalThis.__oneBackgroundTaskProof = `started:${task.identifier}`
        task.signal.addEventListener(
          'abort',
          () => {
            globalThis.__oneBackgroundTaskProof = `expired:${task.identifier}`
            resolve()
          },
          { once: true }
        )
      })
  )
