import { createElement, type ComponentType } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { DOMBrowserBridge, type DOMTransport } from './browserBridge'
import { DOMBridgeContext } from './context'
import { observeDOMSize } from './measure'
import { DOMBridgeError } from './serialize'

declare global {
  var __oneDOM: DOMTransport | undefined
}

/** browser-only virtual entries call this once; inline web components use normal React. */
export function mountDOMComponent(
  Component: ComponentType<any>,
  entryId: string
): () => void {
  const transport = globalThis.__oneDOM
  if (
    !transport ||
    typeof transport.postMessage !== 'function' ||
    typeof transport.subscribe !== 'function'
  ) {
    throw new DOMBridgeError(
      'One DOM host transport was not installed before application script'
    )
  }
  const container = document.getElementById('one-dom-root')
  if (!container) throw new DOMBridgeError('One DOM entry requires #one-dom-root')
  let stopMeasuring: (() => void) | undefined
  let root: Root
  const report = (error: unknown) => bridge.reportError(error)
  const bridge = new DOMBrowserBridge(
    entryId,
    transport,
    (props) => {
      root.render(
        createElement(
          DOMBridgeContext.Provider,
          { value: bridge },
          createElement(Component, props)
        )
      )
    },
    () => {
      stopMeasuring?.()
      window.removeEventListener('pagehide', dispose)
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
      root.unmount()
    },
    report,
    import.meta.env.DEV
  )
  const dispose = () => bridge.dispose()
  const onError = (event: ErrorEvent) => report(event.error || new Error(event.message))
  const onRejection = (event: PromiseRejectionEvent) => report(event.reason)
  root = createRoot(container, {
    onUncaughtError: report,
    onCaughtError: report,
    onRecoverableError: report,
  })
  window.addEventListener('pagehide', dispose)
  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)
  try {
    bridge.start()
    stopMeasuring = observeDOMSize(container, (width, height) =>
      bridge.measure(width, height)
    )
  } catch (error) {
    bridge.dispose()
    throw error
  }
  return dispose
}
