// append to an existing native bundle to exercise RN's real fetch and XHR adapters.
const base = 'http://127.0.0.1:18989'
const report = (name: string, value: unknown) =>
  console.log('[networking-proof]', JSON.stringify({ name, value }))
const check = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message)
}

async function proveNetworking() {
  const health = await fetch('http://127.0.0.1:7777/api/zero/health')
  const healthJSON = await health.json()
  check(health.status === 200 && healthJSON.ok === true, 'daemon JSON')
  report('daemon-health', { status: health.status, ok: healthJSON.ok })

  const echo = await fetch(`${base}/echo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-One-Proof': 'native' },
    body: JSON.stringify({ native: 'macOS', text: '🌊' }),
  })
  const echoed = await echo.json()
  check(echoed.body === '{"native":"macOS","text":"🌊"}' && echoed.header === 'native', 'POST body and header')
  report('post', echoed)
  const failure = await fetch(`${base}/failure`)
  check(failure.status === 503 && (await failure.text()) === 'unavailable', 'HTTP error response')
  report('http-error', failure.status)

  const binary = await fetch(`${base}/echo`, { method: 'POST', body: new Uint8Array([0, 1, 127, 255]) })
  check((await binary.json()).base64 === 'AAF//w==', 'binary POST')
  report('binary-post', true)

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', `${base}/stream`)
    let progress = 0
    xhr.onprogress = () => { progress++ }
    xhr.onload = () => {
      try {
        check(xhr.responseText === 'first 🌊 last' && progress > 0, 'split UTF-8 streaming')
        report('stream', { text: xhr.responseText, progress })
        resolve()
      } catch (error) { reject(error) }
    }
    xhr.onerror = () => reject(new Error('stream failed'))
    xhr.send()
  })
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', `${base}/binary`)
    xhr.responseType = 'arraybuffer'
    xhr.onload = () => {
      try {
        check(Array.from(new Uint8Array(xhr.response)).join(',') === '0,1,127,255', 'binary response')
        report('binary-response', true)
        resolve()
      } catch (error) { reject(error) }
    }
    xhr.onerror = () => reject(new Error('binary response failed'))
    xhr.send()
  })
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', `${base}/slow`)
    xhr.timeout = 100
    xhr.ontimeout = () => { report('timeout', true); resolve() }
    xhr.onload = () => reject(new Error('timeout unexpectedly loaded'))
    xhr.onerror = () => reject(new Error('timeout reported as network error'))
    xhr.send()
  })
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', `${base}/slow`)
    xhr.onabort = () => { report('abort', true); resolve() }
    xhr.onload = () => reject(new Error('aborted request loaded'))
    xhr.send()
    setTimeout(() => xhr.abort(), 50)
  })
  try {
    await fetch('http://127.0.0.1:1/unreachable')
    throw new Error('connection failure unexpectedly loaded')
  } catch (error) {
    check(error instanceof TypeError, 'connection failure must reject fetch')
    report('connection-error', true)
  }
  report('complete', true)
  // leave an active request across host reload; the next runtime runs this entry again.
  fetch(`${base}/slow`).then(() => report('old-request-completed', true)).catch(() => {})
  report('reload-pending', true)
  const generation = await (await fetch(`${base}/generation`)).json()
  if (generation === 1) {
    // reload only the first proof runtime; the server carries this counter across reload.
    setTimeout(() => (globalThis as any).__turboModuleProxy('DevSettings').reload(), 50)
  }
}
proveNetworking().catch((error) => report('FAILED', String(error)))
