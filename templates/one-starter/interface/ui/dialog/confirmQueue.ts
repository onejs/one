import { AbortError } from '@o/helpers'
import { useEffect, useSyncExternalStore } from 'react'

export type DialogConfirmProps = {
  title?: string
  description?: string
  destructive?: boolean
  confirmLabel?: string
  cancelLabel?: string
  extraConfirm?: boolean
}
export type PendingConfirm = {
  id: number
  props: DialogConfirmProps
  resolve: (confirmed: boolean) => void
  reject: (error: Error) => void
}
let queue: PendingConfirm[] = []
const listeners = new Set<() => void>()
const hostWaiters = new Set<() => void>()
let nextId = 0
let hosts = 0
let cleanup: ReturnType<typeof setTimeout> | undefined
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
const snapshot = () => queue[0] ?? null
const serverSnapshot = () => null

export class DialogConfirmUnavailableError extends Error {
  constructor(message = 'dialog confirm host is not mounted') {
    super(message)
    this.name = 'DialogConfirmUnavailableError'
  }
}

export function isDialogConfirmOpen() {
  return queue.length > 0
}

export async function dialogConfirm(props: DialogConfirmProps = {}): Promise<boolean> {
  if (!hosts) {
    await new Promise<void>((resolve) => {
      const mounted = () => {
        clearTimeout(timeout)
        hostWaiters.delete(mounted)
        resolve()
      }
      const timeout = setTimeout(mounted, 150)
      hostWaiters.add(mounted)
    })
  }
  if (!hosts) throw new DialogConfirmUnavailableError()
  return new Promise<boolean>((resolve, reject) => {
    queue = [...queue, { id: ++nextId, props, resolve, reject }]
    for (const listener of listeners) listener()
  })
}

export async function ensureConfirmed(props: DialogConfirmProps = {}) {
  if (!(await dialogConfirm(props))) throw new AbortError()
}

// the host's side of the queue, shared by both legs of DialogConfirm: the
// confirm on screen, and finish, which settles it and shows the next. a
// finish from a confirm that already settled is ignored, so a dismissal that
// follows the action which caused it cannot flip the answer.
export function useDialogConfirmHost() {
  const state = useSyncExternalStore(subscribe, snapshot, serverSnapshot)
  useEffect(() => {
    hosts++
    for (const mounted of hostWaiters) mounted()
    clearTimeout(cleanup)
    return () => {
      hosts--
      cleanup = setTimeout(() => {
        if (hosts) return
        const pending = queue
        queue = []
        for (const item of pending)
          item.reject(new DialogConfirmUnavailableError('dialog confirm host unmounted'))
        for (const listener of listeners) listener()
      }, 0)
    }
  }, [])
  const finish = (confirmed: boolean) => {
    if (!state || queue[0] !== state) return
    queue = queue.slice(1)
    state.resolve(confirmed)
    for (const listener of listeners) listener()
  }
  return { state, finish }
}
