import React from 'react'
import { reconciler, NativeContainer } from './hostConfig'

const roots = new Map<number, any>()

export function render(
  element: React.ReactNode,
  containerId: number = 1,
  callback?: () => void
) {
  let root = roots.get(containerId)
  if (!root) {
    const container: NativeContainer = {
      id: containerId,
      type: 'root',
      props: {},
      children: [],
    }

    root = (reconciler as any).createContainer(
      container,
      1, // ConcurrentRoot
      null,
      false,
      null,
      '',
      (error: any) => console.error('[ReactNativeLite:UncaughtError]', error),
      (error: any) => console.error('[ReactNativeLite:CaughtError]', error),
      (error: any) => console.error('[ReactNativeLite:RecoverableError]', error),
      null
    )
    roots.set(containerId, root)
  }

  reconciler.updateContainer(element, root, null, callback)
  return root
}

export function unmount(containerId: number = 1) {
  const root = roots.get(containerId)
  if (root) {
    if (typeof (reconciler as any).flushSyncFromReconciler === 'function') {
      ;(reconciler as any).flushSyncFromReconciler(() => {
        reconciler.updateContainer(null, root, null, () => {
          roots.delete(containerId)
        })
      })
    } else {
      reconciler.updateContainer(null, root, null, () => {
        roots.delete(containerId)
      })
    }
    roots.delete(containerId)
  }
}
