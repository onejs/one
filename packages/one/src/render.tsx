import { startTransition } from 'react'
import { hydrateRoot, createRoot } from 'react-dom/client'

globalThis['__vxrnVersion'] ||= 0

const listeners = new Set<Function>()
let didRender = false

export function render(element: React.ReactNode) {
  console.warn('element', element)

  if (typeof document === 'undefined') return

  if (globalThis['__vxrnRoot']) {
    globalThis['__vxrnVersion']++
    globalThis['__vxrnRoot'].render(element)
  } else {
    startTransition(() => {
      // TODO this feels like it should be document.documentElement
      // but that causes really bad issues - it will totally freeze pages that need to suspend for example
      // and will log very strange things on routing
      // seems like a legit react 19 bug, this fixes it, and i remember i found a reason why when i originally ran into this
      // but be warned that this also blows away document.body and that can cause all sorts of issues with extensions.
      const rootElement = document

      if (globalThis['__vxrnIsSPA']) {
        const root = createRoot(rootElement as any)
        globalThis['__vxrnRoot'] = root
        root.render(element)
      } else {
        globalThis['__vxrnRoot'] = hydrateRoot(rootElement, element, {
          onRecoverableError(...args) {
            console.groupCollapsed(
              `[one] Non-critical recoverable React error occurred, expand group to see details`
            )
            console.error(...args)
            console.groupEnd()
          },
          // @ts-expect-error
          onUncaughtError(...args) {
            console.error(`[one] onUncaughtError`, ...args)
          },
          onCaughtError(...args) {
            console.error(`[one] onCaughtError`, ...args)
          },
        })
      }
    })
  }

  listeners.forEach((cb) => cb())
  didRender = true
}

export function afterClientRender(listener: Function) {
  if (didRender) {
    listener()
    return
  }

  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
