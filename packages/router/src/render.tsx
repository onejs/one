import { hydrateRoot } from 'react-dom/client'

globalThis['__vxrnVersion'] ||= 0

export function render(App: (props: { path: string }) => JSX.Element, rootQuerySelector = '#root') {
  if (typeof document === 'undefined') return
  const container = document.querySelector(rootQuerySelector)
  if (!container) throw new Error(`No container element found`)
  const element = <App path={window.location.pathname} />
  if (globalThis['__vxrnRoot']) {
    globalThis['__vxrnVersion']++
    globalThis['__vxrnRoot'].render(element)
  } else {
    globalThis['__vxrnRoot'] = hydrateRoot(container, element)
  }
}
