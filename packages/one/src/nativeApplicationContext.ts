export interface NativeApplicationContext {
  serverURL: string
}

let activeContext: NativeApplicationContext | undefined

/**
 * Activate one native application's server before evaluating its modules.
 * Unmount and stop the application before calling the returned cleanup.
 * Call cleanup on evaluation failure too. Only one context may be active.
 */
export function setNativeApplicationContext({ serverURL }: NativeApplicationContext) {
  if (activeContext) {
    throw new Error('A native application context is already active')
  }

  const url = new URL(serverURL)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Native application serverURL must use HTTP or HTTPS')
  }
  if (url.search || url.hash) {
    throw new Error('Native application serverURL must not contain a query or fragment')
  }

  const context = { serverURL: url.href.replace(/\/+$/, '') }
  activeContext = context

  return () => {
    if (activeContext === context) {
      activeContext = undefined
    }
  }
}

export function getNativeApplicationServerURL() {
  return activeContext?.serverURL
}
