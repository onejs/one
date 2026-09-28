import { One } from 'one'
import { Platform } from 'react-native'

declare global {
  var __oneBackgroundTaskProof: string | undefined
}

if (Platform.OS === 'ios') One.iOS.BackgroundTasks.defineTask('dev.vxrn.native.tests.refresh', async (task) => {
  await Promise.resolve()
  if (task.signal.aborted) return
  globalThis.__oneBackgroundTaskProof = `refresh:${task.identifier}`
})

if (Platform.OS === 'ios') One.iOS.BackgroundTasks.defineTask('dev.vxrn.native.tests.processing', (task) =>
  new Promise<void>((resolve) => {
    globalThis.__oneBackgroundTaskProof = `started:${task.identifier}`
    task.signal.addEventListener('abort', () => {
      globalThis.__oneBackgroundTaskProof = `expired:${task.identifier}`
      resolve()
    }, { once: true })
  })
)
