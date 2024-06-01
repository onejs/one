import { startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'

globalThis['__vxrnVersion'] ||= 0

export function render(element: React.ReactNode) {
  if (typeof document === 'undefined') return
  if (globalThis['__vxrnRoot']) {
    globalThis['__vxrnVersion']++
    globalThis['__vxrnRoot'].render(element)
  } else {
    startTransition(() => {
      globalThis['__vxrnRoot'] = hydrateRoot(document.body, element, {
        onRecoverableError(...args) {
          console.error(`[vxs] onRecoverableError`, ...args)
        },
        // @ts-expect-error
        onUncaughtError(...args) {
          console.error(`[vxs] onUncaughtError`, ...args)
        },
        onCaughtError(...args) {
          console.error(`[vxs] onCaughtError`, ...args)
        },
      })
    })
  }
}
