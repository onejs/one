import { startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { loadRoutes } from './useViteRoutes'

globalThis['__vxrnVersion'] ||= 0

export function render(
  App: (props: { path: string }) => JSX.Element,
  routes?: any,
  rootQuerySelector = '#root'
) {
  if (typeof document === 'undefined') return
  const container = document.querySelector(rootQuerySelector)
  const element = <App path={window.location.pathname} />
  if (globalThis['__vxrnRoot']) {
    globalThis['__vxrnVersion']++
    globalThis['__vxrnRoot'].render(element)
  } else {
    function flush() {
      if (!container) {
        throw new Error(`No container element found`)
      }
      // startTransition(() => {
      globalThis['__vxrnRoot'] = hydrateRoot(container, element)
      // })
    }

    if (routes) {
      // loadRoutes(routes)
      flush()
    } else {
      flush()
    }
  }
}
