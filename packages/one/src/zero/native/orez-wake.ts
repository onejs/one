import type { ClientState } from './types'

export type OrezWakeOptions = {
  auth?: () => string | undefined
  getToken?: () => Promise<string>
}

export function subscribeOrezWake(
  server: string,
  identity: Pick<ClientState, 'clientID' | 'clientGroupID'>,
  options: OrezWakeOptions,
  request: () => void
): () => void {
  let stopped = false
  let socket: WebSocket | undefined
  let retry: ReturnType<typeof setTimeout> | undefined
  let keepalive: ReturnType<typeof setInterval> | undefined
  let wake: ReturnType<typeof setTimeout> | undefined
  let attempts = 0
  const reconnect = () => {
    if (stopped || retry !== undefined) return
    const ceiling = Math.min(30_000, 500 * 2 ** Math.min(attempts++, 16))
    retry = setTimeout(
      () => {
        retry = undefined
        void open()
      },
      ceiling / 2 + (Math.random() * ceiling) / 2
    )
  }
  const open = async () => {
    try {
      const token = await options.getToken?.()
      if (stopped) return
      const url = new URL(`${server.replace(/^http/, 'ws')}/wake`)
      url.searchParams.set('clientID', identity.clientID)
      url.searchParams.set('clientGroupID', identity.clientGroupID)
      if (token !== undefined) url.searchParams.set('wakeToken', token)
      const auth = options.getToken ? undefined : options.auth?.()
      const protocol = auth
        ? `orez-auth.${btoa(String.fromCharCode(...new TextEncoder().encode(auth)))
            .replaceAll('+', '-')
            .replaceAll('/', '_')
            .replace(/=+$/, '')}`
        : undefined
      const current = new WebSocket(url.toString(), protocol)
      socket = current
      const disconnected = () => {
        if (socket !== current) return
        socket = undefined
        if (keepalive !== undefined) clearInterval(keepalive)
        if (wake !== undefined) clearTimeout(wake)
        keepalive = wake = undefined
        current.close()
        reconnect()
      }
      current.onopen = () => {
        if (socket !== current) return
        attempts = 0
        keepalive = setInterval(() => current.send('ping'), 60_000)
        request()
      }
      current.onmessage = (event) => {
        if (socket !== current || event.data === 'pong' || wake !== undefined) return
        wake = setTimeout(() => {
          wake = undefined
          request()
        }, 200)
      }
      current.onclose = current.onerror = disconnected
    } catch {
      reconnect()
    }
  }
  void open()
  return () => {
    stopped = true
    if (retry !== undefined) clearTimeout(retry)
    if (keepalive !== undefined) clearInterval(keepalive)
    if (wake !== undefined) clearTimeout(wake)
    const previous = socket
    socket = undefined
    previous?.close()
  }
}
