import { hydrateRoot } from 'react-dom/client'

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
      globalThis['__vxrnRoot'] = hydrateRoot(container, element, {
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
